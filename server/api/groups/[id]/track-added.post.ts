import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { track, addedBy } = body

    if (!groupId || !track || !addedBy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID, track, and addedBy required'
      })
    }

    // Broadcast track added notification to all group members
    await groupService.broadcastToGroup(groupId, {
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
  } catch (error) {
    console.error('Track added notification error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send track notification: ${error.message || error}`
    })
  }
})