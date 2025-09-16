import { groupService } from '~/server/services/groups'
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  try {
    // Get the authenticated session
    const session = await getServerSession(event)
    
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    // Create group with the authenticated user as admin
    const group = groupService.createGroup({
      id: session.user.email || session.user.id || 'unknown',
      name: session.user.name || session.user.email || 'User',
      image: session.user.image,
      spotifyTokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken
      }
    })


    return {
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        admin: group.admin
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create group'
    })
  }
})