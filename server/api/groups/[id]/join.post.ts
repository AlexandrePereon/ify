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

    // Verify user is member of the group
    const group = groupService.getGroup(groupId)
    
    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found'
      })
    }
    
    if (!group.members.some(m => m.id === userId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized to join this group'
      })
    }

    // Start polling for this group if not already started
    if (!spotifyPollingService.getActiveGroups().includes(groupId)) {
      spotifyPollingService.startPolling(groupId)
    }


    return {
      success: true,
      groupId,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        members: group.members,
        currentTrack: group.currentTrack
      }
    }
  } catch (error) {
    console.error('Join group error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to join group: ${error.message || error}`
    })
  }
})