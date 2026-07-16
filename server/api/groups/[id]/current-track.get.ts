import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')

    // Only authenticated members may read the group's playback state.
    await requireGroupMember(event, groupId)

    // Get admin's Spotify tokens
    const tokens = groupService.getAdminTokens(groupId!)

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
      groupId!
    )

    const playback = await spotifyService.getCurrentPlayback()

    return {
      success: true,
      currentTrack: playback?.item || null,
      progressMs: playback?.progress_ms ?? null,
      isPlaying: playback?.is_playing ?? false
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Current track error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get current track'
    })
  }
})