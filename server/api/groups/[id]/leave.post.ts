import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const groupId = getRouterParam(event, 'id')

    if (!groupId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID required'
      })
    }

    // A user may only remove themselves — identity comes from the session,
    // never from the body (otherwise anyone could evict the admin and delete
    // the group).
    const { userId } = await requireUserId(event)

    // Remove the user's event stream (this also stops polling when the group
    // becomes empty) and then remove them from the roster (admin leaving =
    // group deletion).
    groupService.removeEventStream(groupId, userId)
    await groupService.leaveGroup(groupId, userId)

    return {
      success: true,
      message: 'Left group successfully'
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Leave group error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to leave group'
    })
  }
})