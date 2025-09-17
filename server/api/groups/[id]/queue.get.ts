import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  const groupId = getRouterParam(event, 'id')
  
  if (!groupId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Group ID required'
    })
  }

  const group = groupService.getGroup(groupId)
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Group not found'
    })
  }

  try {
    const spotifyService = new SpotifyService(
      group.admin.spotifyTokens.accessToken,
      group.admin.spotifyTokens.refreshToken,
      groupId
    )
    const queue = await spotifyService.getQueue()
    
    return {
      success: true,
      queue: queue.queue || [],
      currentlyPlaying: queue.currently_playing
    }
  } catch (error) {
    console.error('Queue fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch queue',
      data: error.message
    })
  }
})