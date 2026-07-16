import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  const groupId = getRouterParam(event, 'id')

  // Identity comes from the signed session, never from the query string.
  // (EventSource cannot set headers, but cookies are sent automatically.)
  const { userId, group, isAdmin } = await requireGroupMember(event, groupId)

  // Create SSE stream (pure SSE logic)
  const eventStream = createEventStream(event)

  // Register stream in service
  groupService.addEventStream(groupId!, userId, eventStream)

  // Handle client disconnect
  eventStream.onClosed(async () => {
    groupService.removeEventStream(groupId!, userId)

    // Guests that disconnect are removed from the roster after a short grace
    // period (cancelled if they reconnect). The admin is never auto-removed —
    // leaving is an explicit action, otherwise a blip would delete the group.
    if (!isAdmin) {
      groupService.scheduleMemberRemoval(groupId!, userId)
    }

    // Recompute the skip quorum for the remaining connected members.
    const voteData = groupService.getVoteData(groupId!)
    if (voteData) {
      await groupService.broadcastToGroup(groupId!, {
        type: 'vote_update',
        data: voteData
      })
    }
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
