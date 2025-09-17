import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { votes } = body

    if (!groupId || !votes) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID and votes data required'
      })
    }

    // Broadcast vote update to all group members
    await groupService.broadcastToGroup(groupId, {
      type: 'vote_update',
      data: votes
    })


    return {
      success: true,
      message: 'Vote update sent to all group members'
    }
  } catch (error) {
    console.error('Vote update error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send vote update: ${error.message || error}`
    })
  }
})