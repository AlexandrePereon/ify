import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  const groupId = getRouterParam(event, 'id')

  // Only authenticated members may read the group's queue.
  const { group } = await requireGroupMember(event, groupId)

  try {
    const spotifyService = new SpotifyService(
      group.admin.spotifyTokens.accessToken,
      group.admin.spotifyTokens.refreshToken,
      groupId!
    )
    const queue = await spotifyService.getQueue()

    return {
      success: true,
      queue: queue.queue || [],
      currentlyPlaying: queue.currently_playing
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Queue fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch queue'
    })
  }
})