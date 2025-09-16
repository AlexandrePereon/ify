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
    
    // Check if majority reached
    if (groupService.shouldSkip(groupId)) {
      // Get admin's Spotify tokens
      const tokens = groupService.getAdminTokens(groupId)
      if (tokens) {
        // Use admin's tokens to skip track
        const spotifyService = new SpotifyService(tokens.accessToken)
        await spotifyService.skipToNext()
        
        // Clear votes after successful skip
        groupService.clearSkipVotes(groupId)
        
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
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process skip vote'
    })
  }
})