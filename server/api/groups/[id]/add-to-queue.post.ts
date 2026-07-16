import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // Only authenticated members may enqueue on the admin's device.
    const { userId } = await requireGroupMember(event, groupId)

    // Validate the track URI shape to avoid feeding arbitrary values to Spotify.
    if (!body.trackUri || typeof body.trackUri !== 'string' || !/^spotify:track:[A-Za-z0-9]+$/.test(body.trackUri)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valid track URI required'
      })
    }

    enforceRateLimit(rateLimitKey(event, `add-to-queue:${groupId}`, userId), 20, 10_000)

    // Get admin's Spotify tokens
    const tokens = groupService.getAdminTokens(groupId!)
    if (!tokens) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found or admin tokens unavailable'
      })
    }

    // Use admin's tokens to add to Spotify queue
    const spotifyService = new SpotifyService(
      tokens.accessToken,
      tokens.refreshToken,
      groupId!
    )
    await spotifyService.addToQueue(body.trackUri)

    return {
      success: true,
      message: 'Track added to queue'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add track to queue'
    })
  }
})