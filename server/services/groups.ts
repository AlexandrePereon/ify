import { randomUUID, randomInt, randomBytes, timingSafeEqual } from 'node:crypto'
import { spotifyPollingService } from './spotify-polling.js'

interface Group {
  id: string
  code: string
  name: string
  admin: {
    id: string
    name: string
    image?: string
    spotifyTokens: {
      accessToken: string
      refreshToken: string
    }
  }
  members: Array<{
    id: string
    name: string
    image?: string
    type?: string
    joinedAt: Date
  }>
  // Note: We use Spotify's native queue, not our own
  currentTrack: any | null
  votes: {
    skip: string[] // user IDs
  }
  createdAt: Date
  lastActivity: Date
  // When the group last had zero connected SSE clients (null while ≥1 is
  // connected). This — not lastActivity — is what the reaper uses, because
  // Spotify polling keeps lastActivity fresh even when nobody is watching.
  emptySince: Date | null
  // SSE streams for real-time updates
  eventStreams: Map<string, any> // userId -> EventStream
}

// In-memory storage (replace with database later)
const groups = new Map<string, Group>()
const codeToGroupId = new Map<string, string>()
// Per-guest secret proving a credentials login is legitimate, keyed by
// `${groupId}:${userId}`. Never stored on the member object and never
// broadcast, so it cannot leak through SSE/group_state.
const guestSecrets = new Map<string, string>()

export class GroupService {
  // Pending grace-period member removals, keyed by `${groupId}:${userId}`.
  // A short delay lets a transient SSE reconnect cancel the removal instead of
  // evicting a member who only had a network blip.
  private pendingRemovals = new Map<string, NodeJS.Timeout>()
  private readonly REMOVAL_GRACE_MS = 15000

  // Generate unique 6-character code.
  // Uses a CSPRNG (crypto.randomInt) so codes are not predictable from prior
  // ones. The alphabet stays short and easy to type by hand (36^6 ≈ 2.2e9).
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    do {
      code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(randomInt(chars.length))
      }
    } while (codeToGroupId.has(code))

    return code
  }

  // Create new group
  createGroup(admin: { id: string; name: string; image?: string; spotifyTokens: { accessToken: string; refreshToken: string } }, name?: string): Group {
    const id = randomUUID()
    const code = this.generateCode()

    const group: Group = {
      id,
      code,
      name: name || `Groupe de ${admin.name}`,
      admin,
      members: [{
        id: admin.id,
        name: admin.name,
        image: admin.image,
        type: 'admin',
        joinedAt: new Date()
      }],
      currentTrack: null,
      votes: { skip: [] },
      createdAt: new Date(),
      lastActivity: new Date(),
      // Starts "empty": no SSE client has connected yet. Cleared as soon as the
      // admin's stream registers; if it never does, the reaper collects it.
      emptySince: new Date(),
      eventStreams: new Map()
    }

    groups.set(id, group)
    codeToGroupId.set(code, id)

    // Start Spotify polling for this group
    spotifyPollingService.startPolling(id)

    return group
  }

  // Add member to group
  addMemberToGroup(groupId: string, user: any): boolean {
    const group = groups.get(groupId)
    if (!group) return false

    // Check if user already in group
    const existingMember = group.members.find(m => m.id === user.id)
    if (existingMember) return true

    // Add new member
    group.members.push({
      id: user.id,
      name: user.name,
      image: user.image,
      type: user.type || 'guest',
      joinedAt: new Date()
    })

    return true
  }

  // Mint and store a secret for a guest, returned to that guest so it can prove
  // its identity when authenticating. Overwrites any previous secret.
  issueGuestSecret(groupId: string, userId: string): string {
    const secret = randomBytes(32).toString('base64url')
    guestSecrets.set(`${groupId}:${userId}`, secret)
    return secret
  }

  // Constant-time verification of a guest's secret.
  verifyGuestSecret(groupId: string, userId: string, secret: unknown): boolean {
    if (typeof secret !== 'string') return false
    const expected = guestSecrets.get(`${groupId}:${userId}`)
    if (!expected) return false
    const a = Buffer.from(expected)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  }

  private clearGroupSecrets(groupId: string): void {
    for (const key of guestSecrets.keys()) {
      if (key.startsWith(`${groupId}:`)) guestSecrets.delete(key)
    }
  }


  // Get group by ID
  getGroup(id: string): Group | null {
    return groups.get(id) || null
  }

  // Get group by code
  getGroupByCode(code: string): Group | null {
    const id = codeToGroupId.get(code.toUpperCase())
    return id ? this.getGroup(id) : null
  }

  // Join group
  joinGroup(code: string, user: { id: string; name: string; image?: string }): Group | null {
    const group = this.getGroupByCode(code)
    if (!group) return null

    // Check if user already in group
    if (group.members.some(m => m.id === user.id)) {
      return group
    }

    // Add user to group
    group.members.push({
      ...user,
      joinedAt: new Date()
    })

    group.lastActivity = new Date()
    return group
  }

  // Leave group
  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    const group = groups.get(groupId)
    if (!group) return false

    // Remove user from members
    group.members = group.members.filter(m => m.id !== userId)

    // Remove user from votes
    group.votes.skip = group.votes.skip.filter(id => id !== userId)

    // Drop this user's guest secret, if any
    guestSecrets.delete(`${groupId}:${userId}`)

    // If admin leaves, delete group
    if (group.admin.id === userId) {
      // Notify all members that group is being deleted
      await this.broadcastToGroup(groupId, {
        type: 'group_deleted',
        message: 'Group has been closed by the admin'
      })
      this.purgeGroup(groupId)
      return true
    }

    // If no members left, delete group
    if (group.members.length === 0) {
      this.purgeGroup(groupId)
      return true
    }

    group.lastActivity = new Date()
    return true
  }

  // Fully tear down a group and every piece of state that references it.
  // The single place that removes a group from memory.
  private purgeGroup(groupId: string): void {
    const group = groups.get(groupId)
    if (!group) return

    spotifyPollingService.stopPolling(groupId)
    for (const key of [...this.pendingRemovals.keys()]) {
      if (key.startsWith(`${groupId}:`)) this.cancelPendingRemovalByKey(key)
    }
    this.clearGroupSecrets(groupId)
    groups.delete(groupId)
    codeToGroupId.delete(group.code)
  }

  // Get admin's Spotify tokens for API calls
  getAdminTokens(groupId: string): { accessToken: string; refreshToken: string } | null {
    const group = groups.get(groupId)
    return group?.admin.spotifyTokens || null
  }

  // Ids of members that currently have an active SSE stream.
  // Only connected members count toward the skip quorum, otherwise members who
  // closed their tab without leaving would inflate the total and make skipping
  // impossible.
  private getActiveMemberIds(group: Group): string[] {
    const active = group.members
      .map(m => m.id)
      .filter(id => group.eventStreams.has(id))
    // Fall back to the raw member list before any stream has registered
    // (e.g. the very first vote right after joining).
    return active.length > 0 ? active : group.members.map(m => m.id)
  }

  // Vote to skip
  voteSkip(groupId: string, userId: string): { voted: boolean; skipVotes: number; totalMembers: number } {
    const group = groups.get(groupId)
    if (!group || !group.members.some(m => m.id === userId)) {
      return { voted: false, skipVotes: 0, totalMembers: 0 }
    }

    const hasVoted = group.votes.skip.includes(userId)

    if (hasVoted) {
      // Remove vote
      group.votes.skip = group.votes.skip.filter(id => id !== userId)
    } else {
      // Add vote
      group.votes.skip.push(userId)
    }

    group.lastActivity = new Date()

    const activeIds = this.getActiveMemberIds(group)
    return {
      voted: !hasVoted,
      skipVotes: group.votes.skip.filter(id => activeIds.includes(id)).length,
      totalMembers: activeIds.length
    }
  }

  // Check if should skip (majority vote among connected members)
  shouldSkip(groupId: string): boolean {
    const group = groups.get(groupId)
    if (!group) return false

    const activeIds = this.getActiveMemberIds(group)
    const skipVotes = group.votes.skip.filter(id => activeIds.includes(id)).length
    const totalMembers = activeIds.length

    return totalMembers > 0 && skipVotes > totalMembers / 2
  }

  // Clear skip votes
  clearSkipVotes(groupId: string): void {
    const group = groups.get(groupId)
    if (group) {
      group.votes.skip = []
      group.lastActivity = new Date()
    }
  }

  // Get vote data for SSE broadcast
  getVoteData(groupId: string): { skipVotes: number; totalMembers: number; votedUserIds: string[] } | null {
    const group = groups.get(groupId)
    if (!group) return null

    const activeIds = this.getActiveMemberIds(group)
    const activeVotes = group.votes.skip.filter(id => activeIds.includes(id))
    return {
      skipVotes: activeVotes.length,
      totalMembers: activeIds.length,
      votedUserIds: activeVotes
    }
  }

  // Update current track
  updateCurrentTrack(groupId: string, track: any): void {
    const group = groups.get(groupId)
    if (group) {
      group.currentTrack = track
      group.lastActivity = new Date()
    }
  }

  // Add SSE stream for a user in a group
  addEventStream(groupId: string, userId: string, eventStream: any): void {
    const group = groups.get(groupId)
    if (group) {
      // The user (re)connected — cancel any pending grace-period removal.
      this.cancelPendingRemoval(groupId, userId)
      group.eventStreams.set(userId, eventStream)
      // A client is connected again: not empty, and polling should run.
      group.emptySince = null
      spotifyPollingService.startPolling(groupId)
      group.lastActivity = new Date()
    }
  }

  // Remove SSE stream for a user
  removeEventStream(groupId: string, userId: string): void {
    const group = groups.get(groupId)
    if (group) {
      group.eventStreams.delete(userId)
      group.lastActivity = new Date()
      // No one is connected anymore: mark the group empty and stop polling.
      // Polling restarts automatically when a client reconnects
      // (addEventStream), and the reaper purges the group if it stays empty.
      if (group.eventStreams.size === 0) {
        group.emptySince = new Date()
        spotifyPollingService.stopPolling(groupId)
      }
    }
  }

  // Schedule removal of a member after a short grace period. If the member
  // reconnects (addEventStream) before it fires, the removal is cancelled.
  // Guests only — the admin is never auto-removed (that would delete the group
  // on a transient disconnect); admins leave explicitly.
  scheduleMemberRemoval(groupId: string, userId: string): void {
    const key = `${groupId}:${userId}`
    if (this.pendingRemovals.has(key)) return

    const timer = setTimeout(async () => {
      this.pendingRemovals.delete(key)

      const group = groups.get(groupId)
      // Skip if the group is gone or the user reconnected in the meantime.
      if (!group || group.eventStreams.has(userId)) return

      await this.leaveGroup(groupId, userId)

      // Broadcast the updated roster + quorum to remaining members.
      const stillThere = groups.get(groupId)
      if (stillThere) {
        await this.broadcastToGroup(groupId, {
          type: 'group_state',
          data: {
            id: stillThere.id,
            name: stillThere.name,
            code: stillThere.code,
            members: stillThere.members,
            currentTrack: stillThere.currentTrack
          }
        })
        const voteData = this.getVoteData(groupId)
        if (voteData) {
          await this.broadcastToGroup(groupId, { type: 'vote_update', data: voteData })
        }
      }
    }, this.REMOVAL_GRACE_MS)

    // Don't let a pending removal keep the process alive.
    if (typeof timer.unref === 'function') timer.unref()
    this.pendingRemovals.set(key, timer)
  }

  cancelPendingRemoval(groupId: string, userId: string): void {
    this.cancelPendingRemovalByKey(`${groupId}:${userId}`)
  }

  private cancelPendingRemovalByKey(key: string): void {
    const timer = this.pendingRemovals.get(key)
    if (timer) {
      clearTimeout(timer)
      this.pendingRemovals.delete(key)
    }
  }

  // Broadcast message to all connected users in a group
  async broadcastToGroup(groupId: string, message: any): Promise<void> {
    const group = groups.get(groupId)
    if (group) {
      for (const [userId, eventStream] of group.eventStreams) {
        try {
          await eventStream.push(JSON.stringify(message))
        } catch (error) {
          // Remove broken stream
          group.eventStreams.delete(userId)
        }
      }
    }
  }

  // Close a group and notify all members (e.g. the admin's Spotify session
  // expired and the app can no longer control playback).
  async closeGroup(groupId: string, message = 'Group has been closed'): Promise<void> {
    const group = groups.get(groupId)
    if (!group) return

    await this.broadcastToGroup(groupId, {
      type: 'group_deleted',
      message
    })

    this.purgeGroup(groupId)
  }

  // Get all groups (for debugging)
  getAllGroups(): Group[] {
    return Array.from(groups.values())
  }

  // Reap abandoned groups: any group that has had zero connected SSE clients
  // for longer than `emptyTtlMs` is torn down. Inactivity is measured by
  // client presence (emptySince), NOT lastActivity — Spotify polling keeps
  // lastActivity fresh even when nobody is watching, so it can't be trusted
  // as an idle signal. A group with ≥1 connected client is never reaped.
  // Returns the number of groups removed.
  cleanupInactiveGroups(emptyTtlMs = 10 * 60 * 1000): number {
    const now = Date.now()
    let removed = 0

    for (const [id, group] of groups.entries()) {
      // Someone is connected → active, keep it.
      if (group.eventStreams.size > 0) continue

      // Empty: measure how long. Prefer emptySince; fall back to lastActivity
      // if it was somehow never set.
      const idleSince = (group.emptySince ?? group.lastActivity).getTime()
      if (now - idleSince > emptyTtlMs) {
        this.purgeGroup(id)
        removed++
      }
    }

    return removed
  }
}

// Export singleton instance
export const groupService = new GroupService()