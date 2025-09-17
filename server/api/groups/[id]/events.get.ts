import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  const groupId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const userId = query.userId as string

  if (!groupId || !userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Group ID and User ID required'
    })
  }

  // Verify group exists and user is member
  const group = groupService.getGroup(groupId)
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Group not found'
    })
  }

  if (!group.members.some(m => m.id === userId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized to access this group'
    })
  }

  // Create SSE stream
  const eventStream = createEventStream(event)

  // Add user to event streams for this group
  groupService.addEventStream(groupId, userId, eventStream)

  // Send initial connection message
  await eventStream.push(JSON.stringify({
    type: 'connected',
    data: { groupId, userId, timestamp: new Date().toISOString() }
  }))

  // Cleanup when connection closes
  eventStream.onClosed(async () => {
    groupService.removeEventStream(groupId, userId)
  })

  return eventStream.send()
})