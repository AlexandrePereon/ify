import { groupService } from '~/server/services/groups'
import { SpotifyService } from '~/server/services/spotify'
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const session = await getServerSession(event)
    
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    if (!groupId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID required'
      })
    }

    const userId = session.user.email || session.user.id || 'unknown'

    // Vote to skip
    const voteResult = groupService.voteSkip(groupId, userId)

    // Broadcast vote update to all group members
    const voteData = groupService.getVoteData(groupId)
    if (voteData) {
      await groupService.broadcastToGroup(groupId, {
        type: 'vote_update',
        data: voteData
      })
    }

    // Check if majority reached
    if (groupService.shouldSkip(groupId)) {
      console.log('[DEBUG] Majority reached, attempting to skip...')

      // Get admin's Spotify tokens
      const tokens = groupService.getAdminTokens(groupId)
      if (tokens) {
        console.log('[DEBUG] Admin tokens found, creating Spotify service...')

        try {
          // Use admin's tokens to skip track
          const spotifyService = new SpotifyService(
            tokens.accessToken,
            tokens.refreshToken,
            groupId
          )

          console.log('[DEBUG] Calling skipToNext...')
          await spotifyService.skipToNext()

          console.log('[DEBUG] Skip successful, clearing votes...')
          // Clear votes after successful skip
          groupService.clearSkipVotes(groupId)

          return {
            success: true,
            skipped: true,
            message: 'Track skipped'
          }
        } catch (skipError) {
          console.error('[DEBUG] Error during skip:', skipError)
          throw skipError
        }
      } else {
        console.log('[DEBUG] No admin tokens found')
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
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process skip vote'
    })
  }
})