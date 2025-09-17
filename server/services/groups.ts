import { v4 as uuidv4 } from 'uuid'
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
    joinedAt: Date
  }>
  // Note: We use Spotify's native queue, not our own
  currentTrack: any | null
  votes: {
    skip: string[] // user IDs
  }
  createdAt: Date
  lastActivity: Date
  // SSE streams for real-time updates
  eventStreams: Map<string, any> // userId -> EventStream
}

// In-memory storage (replace with database later)
const groups = new Map<string, Group>()
const codeToGroupId = new Map<string, string>()

export class GroupService {

  // Generate unique 6-character code
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    do {
      code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    } while (codeToGroupId.has(code))

    return code
  }

  // Create new group
  createGroup(admin: { id: string; name: string; image?: string; spotifyTokens: { accessToken: string; refreshToken: string } }, name?: string): Group {
    const id = uuidv4()
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
        joinedAt: new Date()
      }],
      currentTrack: null,
      votes: { skip: [] },
      createdAt: new Date(),
      lastActivity: new Date(),
      eventStreams: new Map()
    }

    groups.set(id, group)
    codeToGroupId.set(code, id)

    // Start Spotify polling for this group
    spotifyPollingService.startPolling(id)

    return group
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
  leaveGroup(groupId: string, userId: string): boolean {
    const group = groups.get(groupId)
    if (!group) return false

    // Remove user from members
    group.members = group.members.filter(m => m.id !== userId)

    // Remove user from votes
    group.votes.skip = group.votes.skip.filter(id => id !== userId)

    // If admin leaves, delete group
    if (group.admin.id === userId) {
      // Stop Spotify polling for this group
      spotifyPollingService.stopPolling(groupId)
      groups.delete(groupId)
      codeToGroupId.delete(group.code)
      return true
    }

    // If no members left, delete group
    if (group.members.length === 0) {
      // Stop Spotify polling for this group
      spotifyPollingService.stopPolling(groupId)
      groups.delete(groupId)
      codeToGroupId.delete(group.code)
    }

    group.lastActivity = new Date()
    return true
  }

  // Get admin's Spotify tokens for API calls
  getAdminTokens(groupId: string): { accessToken: string; refreshToken: string } | null {
    const group = groups.get(groupId)
    return group?.admin.spotifyTokens || null
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

    return {
      voted: !hasVoted,
      skipVotes: group.votes.skip.length,
      totalMembers: group.members.length
    }
  }

  // Check if should skip (majority vote)
  shouldSkip(groupId: string): boolean {
    const group = groups.get(groupId)
    if (!group) return false

    const skipVotes = group.votes.skip.length
    const totalMembers = group.members.length

    return skipVotes > totalMembers / 2
  }

  // Clear skip votes
  clearSkipVotes(groupId: string): void {
    const group = groups.get(groupId)
    if (group) {
      group.votes.skip = []
      group.lastActivity = new Date()
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
      group.eventStreams.set(userId, eventStream)
      group.lastActivity = new Date()
    }
  }

  // Remove SSE stream for a user
  removeEventStream(groupId: string, userId: string): void {
    const group = groups.get(groupId)
    if (group) {
      group.eventStreams.delete(userId)
      group.lastActivity = new Date()
    }
  }

  // Broadcast message to all connected users in a group
  async broadcastToGroup(groupId: string, message: any): Promise<void> {
    const group = groups.get(groupId)
    if (group) {
      const messageStr = JSON.stringify(message)
      
      for (const [userId, eventStream] of group.eventStreams) {
        try {
          await eventStream.push(messageStr)
        } catch (error) {
          // Remove broken stream
          group.eventStreams.delete(userId)
        }
      }
    }
  }

  // Get all groups (for debugging)
  getAllGroups(): Group[] {
    return Array.from(groups.values())
  }

  // Cleanup inactive groups (older than 24h)
  cleanupInactiveGroups(): void {
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [id, group] of groups.entries()) {
      if (now.getTime() - group.lastActivity.getTime() > maxAge) {
        groups.delete(id)
        codeToGroupId.delete(group.code)
      }
    }
  }
}

// Export singleton instance
export const groupService = new GroupService()