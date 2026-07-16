import { groupService } from '~/server/services/groups'
import { spotifyPollingService } from '~/server/services/spotify-polling'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')

    // Membership is derived from the signed session, not from the request body.
    const { group } = await requireGroupMember(event, groupId)

    // Start polling for this group if not already started
    if (!spotifyPollingService.getActiveGroups().includes(group.id)) {
      spotifyPollingService.startPolling(group.id)
    }

    return {
      success: true,
      groupId: group.id,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        members: group.members,
        currentTrack: group.currentTrack
      }
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Join group error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to join group'
    })
  }
})