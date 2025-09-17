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

  // Verify user is member of the group (business logic)
  const group = groupService.getGroup(groupId)
  if (!group || !group.members.some(m => m.id === userId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized to access this group'
    })
  }

  // Create SSE stream (pure SSE logic)
  const eventStream = createEventStream(event)

  // Register stream in service
  groupService.addEventStream(groupId, userId, eventStream)

  // Handle client disconnect
  eventStream.onClosed(async () => {
    groupService.removeEventStream(groupId, userId)
    await eventStream.close()
  })

  // Send initial state after stream is ready
  setTimeout(async () => {
    try {
      const initialMessage = JSON.stringify({
        type: 'group_state',
        data: {
          id: group.id,
          name: group.name,
          code: group.code,
          members: group.members,
          currentTrack: group.currentTrack
        },
        timestamp: new Date().toISOString()
      })
      
      await eventStream.push(initialMessage)
    } catch (pushError) {
      // Silent fail
    }
  }, 100)

  return eventStream.send()
})