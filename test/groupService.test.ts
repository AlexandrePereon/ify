import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { groupService } from '../server/services/groups'

// Fake SSE stream — enough for the service to register/broadcast.
const fakeStream = () => ({ push: async () => {} })

const makeAdmin = (id: string) => ({
  id,
  name: id,
  spotifyTokens: { accessToken: 'a', refreshToken: 'r' }
})

// Register a stream for every member so they count as "connected/active".
const connectAll = (group: any) => {
  for (const m of group.members) {
    groupService.addEventStream(group.id, m.id, fakeStream())
  }
}

describe('GroupService', () => {
  beforeEach(() => {
    // Fake timers so createGroup's polling interval and grace-period timers
    // never fire against a real Spotify service.
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates a 6-char uppercase-alphanumeric code', () => {
    const group = groupService.createGroup(makeAdmin('admin@a.com'))
    expect(group.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('skips only when connected votes exceed half of connected members', () => {
    const group = groupService.createGroup(makeAdmin('admin1'))
    groupService.addMemberToGroup(group.id, { id: 'g1', name: 'g1', type: 'guest' })
    groupService.addMemberToGroup(group.id, { id: 'g2', name: 'g2', type: 'guest' })
    connectAll(groupService.getGroup(group.id))

    // 3 connected members → need > 1.5 → 2 votes
    groupService.voteSkip(group.id, 'g1')
    expect(groupService.shouldSkip(group.id)).toBe(false)

    groupService.voteSkip(group.id, 'g2')
    expect(groupService.shouldSkip(group.id)).toBe(true)
  })

  it('ignores disconnected (ghost) members in the quorum', () => {
    const group = groupService.createGroup(makeAdmin('admin2'))
    groupService.addMemberToGroup(group.id, { id: 'gg1', name: 'gg1', type: 'guest' })
    groupService.addMemberToGroup(group.id, { id: 'ghost', name: 'ghost', type: 'guest' })

    // Only the admin and gg1 are connected; "ghost" never opened a stream.
    groupService.addEventStream(group.id, 'admin2', fakeStream())
    groupService.addEventStream(group.id, 'gg1', fakeStream())

    const data = groupService.getVoteData(group.id)
    expect(data?.totalMembers).toBe(2) // ghost excluded

    groupService.voteSkip(group.id, 'admin2')
    groupService.voteSkip(group.id, 'gg1')
    // 2 of 2 connected → majority reached even though a 3rd member exists
    expect(groupService.shouldSkip(group.id)).toBe(true)
  })

  it('verifies guest secrets and rejects wrong/unknown ones', () => {
    const group = groupService.createGroup(makeAdmin('admin3'))
    const secret = groupService.issueGuestSecret(group.id, 'guest_x')

    expect(groupService.verifyGuestSecret(group.id, 'guest_x', secret)).toBe(true)
    expect(groupService.verifyGuestSecret(group.id, 'guest_x', 'wrong')).toBe(false)
    expect(groupService.verifyGuestSecret(group.id, 'guest_unknown', secret)).toBe(false)
    expect(groupService.verifyGuestSecret(group.id, 'guest_x', undefined)).toBe(false)
  })

  it('deletes the group and its code when the admin leaves', async () => {
    const group = groupService.createGroup(makeAdmin('admin4'))
    const code = group.code

    await groupService.leaveGroup(group.id, 'admin4')

    expect(groupService.getGroup(group.id)).toBeNull()
    expect(groupService.getGroupByCode(code)).toBeNull()
  })

  it('removes a disconnected guest after the grace period, but not if they reconnect', async () => {
    const group = groupService.createGroup(makeAdmin('admin5'))
    groupService.addMemberToGroup(group.id, { id: 'g_leave', name: 'g_leave', type: 'guest' })
    groupService.addMemberToGroup(group.id, { id: 'g_stay', name: 'g_stay', type: 'guest' })
    connectAll(groupService.getGroup(group.id))

    // g_stay disconnects then reconnects before the timer → survives.
    groupService.removeEventStream(group.id, 'g_stay')
    groupService.scheduleMemberRemoval(group.id, 'g_stay')
    groupService.addEventStream(group.id, 'g_stay', fakeStream()) // reconnect cancels

    // g_leave disconnects and stays gone.
    groupService.removeEventStream(group.id, 'g_leave')
    groupService.scheduleMemberRemoval(group.id, 'g_leave')

    await vi.advanceTimersByTimeAsync(20000)

    const members = groupService.getGroup(group.id)!.members.map(m => m.id)
    expect(members).toContain('g_stay')
    expect(members).not.toContain('g_leave')
  })

  it('reaps a group with no connected clients past the empty TTL', () => {
    const group = groupService.createGroup(makeAdmin('admin6'))
    // No stream ever connected; make it look empty for a while.
    groupService.getGroup(group.id)!.emptySince = new Date(Date.now() - 30 * 60 * 1000)

    groupService.cleanupInactiveGroups()

    expect(groupService.getGroup(group.id)).toBeNull()
  })

  it('never reaps a group that still has a connected client', () => {
    const group = groupService.createGroup(makeAdmin('admin7'))
    groupService.addEventStream(group.id, 'admin7', fakeStream())
    // Even if lastActivity/emptySince look old, a live stream keeps it alive.
    groupService.getGroup(group.id)!.lastActivity = new Date(Date.now() - 48 * 60 * 60 * 1000)

    groupService.cleanupInactiveGroups()

    expect(groupService.getGroup(group.id)).not.toBeNull()
  })

  it('marks a group empty (and reapable) once its last client disconnects', async () => {
    const group = groupService.createGroup(makeAdmin('admin8'))
    groupService.addEventStream(group.id, 'admin8', fakeStream())
    expect(groupService.getGroup(group.id)!.emptySince).toBeNull()

    groupService.removeEventStream(group.id, 'admin8')
    expect(groupService.getGroup(group.id)!.emptySince).not.toBeNull()

    // Backdate the empty timestamp and confirm the reaper collects it.
    groupService.getGroup(group.id)!.emptySince = new Date(Date.now() - 30 * 60 * 1000)
    groupService.cleanupInactiveGroups()
    expect(groupService.getGroup(group.id)).toBeNull()
  })
})
