import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const body = await readBody(event)
  const { name, groupCode } = body

  if (!name || typeof name !== 'string' || !groupCode || typeof groupCode !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and group code required'
    })
  }

  // Enforce a sane name length server-side (the client maxlength is not enough).
  const trimmedName = name.trim()
  if (trimmedName.length === 0 || trimmedName.length > 30) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name must be between 1 and 30 characters'
    })
  }

  // Rate limit guest creation per IP to prevent member/ghost flooding.
  enforceRateLimit(rateLimitKey(event, 'guest-create'), 10, 60_000)

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
  const guestId = `guest_${Date.now()}_${randomBytes(9).toString('hex')}`

  // Add guest to group members (secret is NOT stored on the member object)
  groupService.addMemberToGroup(group.id, {
    id: guestId,
    name: trimmedName,
    type: 'guest',
    image: null
  })

  // Issue a one-per-guest secret that must be presented at credentials login,
  // so a leaked guest id alone cannot be replayed to impersonate the guest.
  const secret = groupService.issueGuestSecret(group.id, guestId)

  const guestUser = {
    id: guestId,
    name: trimmedName,
    type: 'guest',
    groupId: group.id,
    groupCode: group.code,
    secret,
    image: null
  }

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