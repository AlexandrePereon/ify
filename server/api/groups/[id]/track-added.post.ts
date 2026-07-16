import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { track } = body

    // Only members may notify the group, and the "added by" name is taken from
    // the session so it cannot be spoofed.
    const { group, session } = await requireGroupMember(event, groupId)

    if (!track) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Track required'
      })
    }

    const addedBy = session.user?.name || 'Anonymous'

    await groupService.broadcastToGroup(group.id, {
      type: 'track_added_notification',
      data: {
        track,
        addedBy,
        timestamp: new Date()
      }
    })

    return {
      success: true,
      message: 'Track notification sent to all group members'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Track added notification error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send track notification'
    })
  }
})
