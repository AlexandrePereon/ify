import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!groupId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID required'
      })
    }

    if (!body.trackUri) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Track URI required'
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

    // Use admin's tokens to add to Spotify queue
    const spotifyService = new SpotifyService(tokens.accessToken)
    await spotifyService.addToQueue(body.trackUri)

    return {
      success: true,
      message: 'Track added to queue'
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add track to queue'
    })
  }
})