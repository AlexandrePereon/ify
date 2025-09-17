export default defineEventHandler(async (event) => {
  const { getServerSession } = await import('#auth')
  const session = await getServerSession(event)
  
  if (!session?.user) {
    return { success: false, message: 'Not authenticated' }
  }

  const user = session.user as any
  const { groupService } = await import('~/server/services/groups')

  try {
    if (user.type === 'guest') {
      // Guest: Remove from group
      if (user.groupId) {
        await groupService.leaveGroup(user.groupId, user.id)
      }
    } else {
      // Admin: Find and delete their group
      const groups = groupService.getAllGroups()
      const adminGroup = groups.find(group => group.admin.id === user.id)
      if (adminGroup) {
        await groupService.leaveGroup(adminGroup.id, user.id) // This will delete the group since admin is leaving
      }
    }

    return { 
      success: true, 
      userType: user.type,
      redirectTo: '/'
    }
  } catch (error) {
    return { 
      success: false, 
      message: 'Error during logout cleanup',
      redirectTo: '/'
    }
  }
})