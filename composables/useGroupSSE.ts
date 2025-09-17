import type { SSEMessage } from './useSSE'

export interface GroupSSEData {
  playback_update: {
    currentTrack: any | null
  }
  queue_update: {
    queue: any[]
  }
  group_state: {
    id: string
    name: string
    code: string
    members: any[]
    currentTrack: any | null
  }
  track_added_notification: {
    track: any
    addedBy: string
    timestamp: string
  }
  vote_update: {
    skipVotes: number
    totalMembers: number
  }
}

export type GroupSSEMessageType = keyof GroupSSEData

export interface GroupSSEOptions {
  groupId: string
  userId: string
  onPlaybackUpdate?: (data: GroupSSEData['playback_update']) => void
  onQueueUpdate?: (data: GroupSSEData['queue_update']) => void
  onGroupState?: (data: GroupSSEData['group_state']) => void
  onTrackAdded?: (data: GroupSSEData['track_added_notification']) => void
  onVoteUpdate?: (data: GroupSSEData['vote_update']) => void
  onError?: (error: Event) => void
}

export function useGroupSSE(options: GroupSSEOptions) {
  const {
    eventSource,
    isConnected,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect
  } = useSSE({
    url: `/groups/${options.groupId}/events`,
    params: {
      userId: options.userId
    },
    autoReconnect: true,
    reconnectDelay: 3000,
    onMessage: (message: SSEMessage) => {
      handleGroupMessage(message)
    },
    onError: options.onError
  })

  // Handle group-specific messages
  const handleGroupMessage = (message: SSEMessage) => {
    const { type, data } = message

    switch (type as GroupSSEMessageType) {
      case 'playback_update':
        options.onPlaybackUpdate?.(data)
        break
      
      case 'queue_update':
        options.onQueueUpdate?.(data)
        break
      
      case 'group_state':
        options.onGroupState?.(data)
        break
      
      case 'track_added_notification':
        options.onTrackAdded?.(data)
        break
      
      case 'vote_update':
        options.onVoteUpdate?.(data)
        break
    }
  }

  // Group-specific actions via REST API
  const joinGroup = async () => {
    try {
      const result = await $fetch(`/api/groups/${options.groupId}/join`, {
        method: 'POST',
        body: { userId: options.userId }
      })
      return result
    } catch (error) {
      throw error
    }
  }

  const leaveGroup = async () => {
    try {
      await $fetch(`/api/groups/${options.groupId}/leave`, {
        method: 'POST',
        body: { userId: options.userId }
      })
    } catch (error) {
      throw error
    }
  }

  const notifyTrackAdded = async (track: any, addedBy: string) => {
    try {
      await $fetch(`/api/groups/${options.groupId}/track-added`, {
        method: 'POST',
        body: { track, addedBy }
      })
    } catch (error) {
      throw error
    }
  }

  const notifyVoteUpdate = async (votes: any) => {
    try {
      await $fetch(`/api/groups/${options.groupId}/vote-update`, {
        method: 'POST',
        body: { votes }
      })
    } catch (error) {
      throw error
    }
  }

  return {
    // SSE connection state
    eventSource,
    isConnected,
    error,
    reconnectAttempts,
    
    // Connection controls
    connect,
    disconnect,
    reconnect,
    
    // Group actions
    joinGroup,
    leaveGroup,
    notifyTrackAdded,
    notifyVoteUpdate
  }
}