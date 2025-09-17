import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    
    if (!groupId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID required'
      })
    }

    // Get admin's Spotify tokens
    const tokens = groupService.getAdminTokens(groupId)
    
    if (!tokens) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found or admin tokens unavailable'
      })
    }

    // Use admin's tokens to get current playback
    const spotifyService = new SpotifyService(
      tokens.accessToken, 
      tokens.refreshToken, 
      groupId
    )
    
    const playback = await spotifyService.getCurrentPlayback()

    return {
      success: true,
      currentTrack: playback?.item || null
    }
  } catch (error) {
    console.error('Current track error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to get current track: ${error.message || error}`
    })
  }
})