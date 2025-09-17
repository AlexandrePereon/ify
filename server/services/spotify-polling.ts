import { SpotifyService } from './spotify'
import { groupService } from './groups'

interface GroupPollingData {
  groupId: string
  intervalId: NodeJS.Timeout
  lastTrackId: string | null
  lastPlaybackState: any
  lastQueue: any[]
}

class SpotifyPollingService {
  private activePolls = new Map<string, GroupPollingData>()
  private readonly POLL_INTERVAL = 5000 // 5 seconds

  // Start polling for a specific group
  startPolling(groupId: string) {
    // Don't start if already polling
    if (this.activePolls.has(groupId)) {
      return
    }


    const intervalId = setInterval(async () => {
      await this.pollSpotifyForGroup(groupId)
    }, this.POLL_INTERVAL)

    this.activePolls.set(groupId, {
      groupId,
      intervalId,
      lastTrackId: null,
      lastPlaybackState: null,
      lastQueue: []
    })
  }

  // Stop polling for a specific group
  stopPolling(groupId: string) {
    const pollData = this.activePolls.get(groupId)
    if (pollData) {
      clearInterval(pollData.intervalId)
      this.activePolls.delete(groupId)
    }
  }

  // Poll Spotify for a specific group
  private async pollSpotifyForGroup(groupId: string) {
    try {
      // Get admin's tokens
      const tokens = groupService.getAdminTokens(groupId)
      if (!tokens) {
        console.warn(`No tokens found for group ${groupId}, stopping polling`)
        this.stopPolling(groupId)
        return
      }

      // Create Spotify service with admin's tokens
      const spotifyService = new SpotifyService(
        tokens.accessToken, 
        tokens.refreshToken, 
        groupId
      )
      
      // Get current playback and queue
      const playbackState = await spotifyService.getCurrentPlayback()
      const queueData = await spotifyService.getQueue()
      
      // Get polling data
      const pollData = this.activePolls.get(groupId)
      if (!pollData) return

      // Check if track changed (only compare essential fields)
      const currentTrackId = playbackState?.item?.id || null
      const hasTrackChanged = currentTrackId !== pollData.lastTrackId
      
      // Check if playback state changed (only essential fields)
      const hasPlaybackChanged = this.hasPlaybackStateChanged(
        pollData.lastPlaybackState,
        playbackState
      )

      // Check if queue changed (only compare track IDs and order)
      const currentQueue = queueData?.queue || []
      const hasQueueChanged = this.hasQueueChanged(pollData.lastQueue, currentQueue)

      // Only notify if something changed
      if (hasTrackChanged || hasPlaybackChanged) {
        // Update stored state
        pollData.lastTrackId = currentTrackId
        pollData.lastPlaybackState = playbackState

        // Update group's current track
        groupService.updateCurrentTrack(groupId, playbackState?.item || null)

        // Notify SSE clients
        const notificationData = {
          currentTrack: playbackState?.item || null
        }
        
        await this.notifyClients(groupId, notificationData, 'playback_update')
      }

      if (hasQueueChanged) {
        // Update stored queue
        pollData.lastQueue = currentQueue

        // Notify SSE clients about queue change
        await this.notifyClients(groupId, {
          queue: currentQueue
        }, 'queue_update')
      }

    } catch (error) {
      console.error(`Error polling Spotify for group ${groupId}:`, error)
      
      // If token expired, stop polling
      if (error.statusCode === 401) {
        this.stopPolling(groupId)
      }
    }
  }

  // Check if playback state has meaningfully changed (only essential fields)
  private hasPlaybackStateChanged(oldState: any, newState: any): boolean {
    if (!oldState && !newState) return false
    if (!oldState || !newState) return true

    // Only compare essential fields that users care about
    const oldEssentials = {
      is_playing: oldState.is_playing || false,
      track_id: oldState.item?.id || null,
      shuffle_state: oldState.shuffle_state || false,
      repeat_state: oldState.repeat_state || 'off'
    }

    const newEssentials = {
      is_playing: newState.is_playing || false,
      track_id: newState.item?.id || null,
      shuffle_state: newState.shuffle_state || false,
      repeat_state: newState.repeat_state || 'off'
    }

    return JSON.stringify(oldEssentials) !== JSON.stringify(newEssentials)
  }

  // Check if queue has changed (only compare track IDs and order)
  private hasQueueChanged(oldQueue: any[], newQueue: any[]): boolean {
    if (oldQueue.length !== newQueue.length) return true
    
    // Only compare track IDs in order (ignore all other metadata)
    const oldIds = oldQueue.map(track => track?.id || null)
    const newIds = newQueue.map(track => track?.id || null)
    
    return JSON.stringify(oldIds) !== JSON.stringify(newIds)
  }

  // Notify SSE clients
  private async notifyClients(groupId: string, data: any, type = 'playback_update'): Promise<void> {
    try {
      await groupService.broadcastToGroup(groupId, {
        type,
        data
      })
    } catch (error) {
      console.error('Error notifying SSE clients:', error)
    }
  }

  // Get all active polling groups
  getActiveGroups(): string[] {
    return Array.from(this.activePolls.keys())
  }

  // Stop all polling (for cleanup)
  stopAllPolling() {
    for (const groupId of this.activePolls.keys()) {
      this.stopPolling(groupId)
    }
  }
}

// Export singleton instance
export const spotifyPollingService = new SpotifyPollingService()

// Cleanup on process exit
process.on('SIGINT', () => {
  spotifyPollingService.stopAllPolling()
})

process.on('SIGTERM', () => {
  spotifyPollingService.stopAllPolling()
})