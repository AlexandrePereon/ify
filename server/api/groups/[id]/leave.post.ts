import { groupService } from '~/server/services/groups'
import { spotifyPollingService } from '~/server/services/spotify-polling'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { userId } = body

    if (!groupId || !userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID and User ID required'
      })
    }

    // Remove user's event stream
    groupService.removeEventStream(groupId, userId)

    // Check if any users are still connected to this group
    const group = groupService.getGroup(groupId)
    if (group && group.eventStreams.size === 0) {
      // No more connected clients, stop polling for this group
      spotifyPollingService.stopPolling(groupId)
    }


    return {
      success: true,
      message: 'Left group successfully'
    }
  } catch (error) {
    console.error('Leave group error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to leave group: ${error.message || error}`
    })
  }
})