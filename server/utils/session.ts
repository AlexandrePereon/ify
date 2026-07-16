import { getServerSession } from '#auth'
import { groupService } from '~/server/services/groups'

// Defense-in-depth CSRF guard. The session cookie is already SameSite=Lax
// (so cross-site POSTs don't carry it), but we additionally reject any
// state-changing request whose Origin doesn't match our own host.
export function assertSameOrigin(event: any): void {
  const method = (event.method || getMethod(event) || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const origin = getHeader(event, 'origin')
  if (!origin) return // non-browser client or same-origin nav without Origin

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({ statusCode: 403, statusMessage: 'Invalid origin' })
  }

  const allowedHosts = new Set<string>()
  const hostHeader = getHeader(event, 'host')
  if (hostHeader) allowedHosts.add(hostHeader)
  const forwardedHost = getHeader(event, 'x-forwarded-host')
  if (forwardedHost) allowedHosts.add(forwardedHost)
  try {
    const configuredOrigin = useRuntimeConfig().authOrigin
    if (configuredOrigin) allowedHosts.add(new URL(configuredOrigin).host)
  } catch {
    // ignore malformed/absent config
  }

  if (!allowedHosts.has(originHost)) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request blocked' })
  }
}

// Derive a trusted user id from the signed session.
// Guests carry a `guest_...` id; Spotify admins are keyed by email.
// This must match how members are stored in the group (see groups.ts / create.post.ts).
export function getSessionUserId(session: any): string | null {
  const user = session?.user
  if (!user) return null
  if (user.type === 'guest') return user.id || null
  return user.email || user.id || null
}

// Require an authenticated session and return the resolved user id.
// Also enforces the same-origin CSRF guard on state-changing requests.
export async function requireUserId(event: any): Promise<{ session: any; userId: string }> {
  assertSameOrigin(event)
  const session = await getServerSession(event)
  const userId = getSessionUserId(session)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return { session, userId }
}

// Require that the caller is an authenticated member of the given group.
// Returns the resolved user id, the group, and whether the caller is the admin.
export async function requireGroupMember(event: any, groupId: string | undefined) {
  if (!groupId) {
    throw createError({ statusCode: 400, statusMessage: 'Group ID required' })
  }

  const { session, userId } = await requireUserId(event)

  const group = groupService.getGroup(groupId)
  if (!group) {
    throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  }

  if (!group.members.some((m: any) => m.id === userId)) {
    throw createError({ statusCode: 403, statusMessage: 'Not a member of this group' })
  }

  return { session, userId, group, isAdmin: group.admin.id === userId }
}
