import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { groupCode } = body

    // Only an authenticated Spotify user joins by code here (guests use the
    // /api/auth/guest flow). Identity is taken from the session, not the body.
    const { session, userId } = await requireUserId(event)

    if (!groupCode || typeof groupCode !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group code required'
      })
    }

    enforceRateLimit(rateLimitKey(event, 'join-by-code', userId), 15, 60_000)

    // Find group by code
    const group = groupService.getGroupByCode(groupCode)
    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found'
      })
    }

    // Add the session user to the group (server-controlled identity)
    groupService.addMemberToGroup(group.id, {
      id: userId,
      name: session.user?.name || session.user?.email || 'User',
      image: session.user?.image,
      type: (session.user as any)?.type || 'spotify'
    })

    return {
      success: true,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        members: group.members,
        currentTrack: group.currentTrack
      }
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Join by code error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to join group'
    })
  }
})
