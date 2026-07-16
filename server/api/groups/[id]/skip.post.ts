import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')

    // Only authenticated members may vote to skip.
    const { userId, group } = await requireGroupMember(event, groupId)

    enforceRateLimit(rateLimitKey(event, `skip:${group.id}`, userId), 20, 10_000)

    // Vote to skip
    const voteResult = groupService.voteSkip(group.id, userId)

    // Broadcast vote update to all group members
    const voteData = groupService.getVoteData(group.id)
    if (voteData) {
      await groupService.broadcastToGroup(group.id, {
        type: 'vote_update',
        data: voteData
      })
    }

    // Check if majority reached
    if (groupService.shouldSkip(group.id)) {
      const tokens = groupService.getAdminTokens(group.id)
      if (tokens) {
        const spotifyService = new SpotifyService(
          tokens.accessToken,
          tokens.refreshToken,
          group.id
        )

        await spotifyService.skipToNext()

        // Clear votes after successful skip
        groupService.clearSkipVotes(group.id)

        return {
          success: true,
          skipped: true,
          message: 'Track skipped'
        }
      }
    }

    return {
      success: true,
      skipped: false,
      voted: voteResult.voted,
      skipVotes: voteResult.skipVotes,
      totalMembers: voteResult.totalMembers,
      message: voteResult.voted ? 'Vote added' : 'Vote removed'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Skip vote error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process skip vote'
    })
  }
})