import { groupService } from '~/server/services/groups'
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  try {
    assertSameOrigin(event)

    // Get the authenticated session
    const session = await getServerSession(event)
    
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    // Only Spotify users can create a group (guests have no playback to share).
    if ((session.user as any).type === 'guest' || !(session as any).accessToken) {
      throw createError({
        statusCode: 403,
        statusMessage: 'A Spotify account is required to create a group'
      })
    }

    enforceRateLimit(rateLimitKey(event, 'group-create', session.user.email), 5, 60_000)

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


    // Never leak the admin's Spotify tokens to the client.
    return {
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        admin: {
          id: group.admin.id,
          name: group.admin.name,
          image: group.admin.image
        }
      }
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create group'
    })
  }
})