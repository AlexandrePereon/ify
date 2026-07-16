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
      // Admin (Spotify): the session has no `user.id`; admins are keyed by
      // email everywhere (see create.post.ts / getSessionUserId).
      const adminId = getSessionUserId(session)
      const adminGroup = adminId
        ? groupService.getAllGroups().find(group => group.admin.id === adminId)
        : undefined
      if (adminGroup && adminId) {
        // Deletes the group since the admin is leaving.
        await groupService.leaveGroup(adminGroup.id, adminId)
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