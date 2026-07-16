import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')

    // Only members may trigger a broadcast, and the payload is authoritative
    // server state — never client-supplied vote counts.
    const { group } = await requireGroupMember(event, groupId)

    const voteData = groupService.getVoteData(group.id)
    if (voteData) {
      await groupService.broadcastToGroup(group.id, {
        type: 'vote_update',
        data: voteData
      })
    }

    return {
      success: true,
      message: 'Vote update sent to all group members'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Vote update error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send vote update'
    })
  }
})
