export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, groupCode } = body

  if (!name || !groupCode) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and group code required'
    })
  }

  // Check if group exists by code
  const { groupService } = await import('~/server/services/groups')
  const group = groupService.getGroupByCode(groupCode)
  
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Group not found'
    })
  }

  // Create guest session
  const guestUser = {
    id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    type: 'guest',
    groupId: group.id,
    groupCode: group.code,
    image: null
  }

  // Add guest to group members
  groupService.addMemberToGroup(group.id, guestUser)

  return {
    success: true,
    user: guestUser,
    group: {
      id: group.id,
      name: group.name,
      code: group.code
    }
  }
})