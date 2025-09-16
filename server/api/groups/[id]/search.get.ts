import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const query = getQuery(event)
    
    if (!groupId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID required'
      })
    }

    if (!query.q) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Search query required'
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

    // Use admin's tokens to search Spotify
    const spotifyService = new SpotifyService(tokens.accessToken)
    const tracks = await spotifyService.searchTracks(query.q as string, 20)

    return {
      success: true,
      tracks
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Search failed'
    })
  }
})