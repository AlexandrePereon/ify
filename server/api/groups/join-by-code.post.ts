import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { groupCode, user } = body

    if (!groupCode || !user) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group code and user data required'
      })
    }

    // Find group by code
    const group = groupService.getGroupByCode(groupCode)
    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found'
      })
    }

    // Add user to group
    const success = groupService.addMemberToGroup(group.id, user)
    if (!success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to join group'
      })
    }

    return {
      success: true,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        members: group.members,
        currentTrack: group.currentTrack
      }
    }
  } catch (error) {
    console.error('Join by code error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to join group: ${error.message || error}`
    })
  }
})