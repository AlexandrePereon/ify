import { SpotifyService } from './spotify'
import { groupService } from './groups'

interface GroupPollingData {
  groupId: string
  intervalId: NodeJS.Timeout
  lastTrackId: string | null
  lastPlaybackState: any
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

    console.log(`Starting Spotify polling for group: ${groupId}`)

    const intervalId = setInterval(async () => {
      await this.pollSpotifyForGroup(groupId)
    }, this.POLL_INTERVAL)

    this.activePolls.set(groupId, {
      groupId,
      intervalId,
      lastTrackId: null,
      lastPlaybackState: null
    })
  }

  // Stop polling for a specific group
  stopPolling(groupId: string) {
    const pollData = this.activePolls.get(groupId)
    if (pollData) {
      console.log(`Stopping Spotify polling for group: ${groupId}`)
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
      const spotifyService = new SpotifyService(tokens.accessToken)
      
      // Get current playback
      const playbackState = await spotifyService.getCurrentPlayback()
      
      // Get polling data
      const pollData = this.activePolls.get(groupId)
      if (!pollData) return

      // Check if track changed
      const currentTrackId = playbackState?.item?.id || null
      const hasTrackChanged = currentTrackId !== pollData.lastTrackId
      
      // Check if playback state changed (play/pause, progress, etc.)
      const hasPlaybackChanged = this.hasPlaybackStateChanged(
        pollData.lastPlaybackState,
        playbackState
      )

      // Only notify if something changed
      if (hasTrackChanged || hasPlaybackChanged) {
        console.log(`Spotify state changed for group ${groupId}:`, {
          trackChanged: hasTrackChanged,
          playbackChanged: hasPlaybackChanged,
          currentTrack: playbackState?.item?.name
        })

        // Update stored state
        pollData.lastTrackId = currentTrackId
        pollData.lastPlaybackState = playbackState

        // Update group's current track
        groupService.updateCurrentTrack(groupId, playbackState?.item || null)

        // TODO: Notify WebSocket clients
        this.notifyClients(groupId, {
          type: 'playback_update',
          data: {
            currentTrack: playbackState?.item || null,
            isPlaying: playbackState?.is_playing || false,
            progressMs: playbackState?.progress_ms || 0
          }
        })
      }

    } catch (error) {
      console.error(`Error polling Spotify for group ${groupId}:`, error)
      
      // If token expired, stop polling
      if (error.statusCode === 401) {
        console.log(`Token expired for group ${groupId}, stopping polling`)
        this.stopPolling(groupId)
      }
    }
  }

  // Check if playback state has meaningfully changed
  private hasPlaybackStateChanged(oldState: any, newState: any): boolean {
    if (!oldState && !newState) return false
    if (!oldState || !newState) return true

    // Check key playback properties
    return (
      oldState.is_playing !== newState.is_playing ||
      Math.abs((oldState.progress_ms || 0) - (newState.progress_ms || 0)) > 2000 || // 2s threshold
      oldState.shuffle_state !== newState.shuffle_state ||
      oldState.repeat_state !== newState.repeat_state
    )
  }

  // Notify WebSocket clients (placeholder)
  private notifyClients(groupId: string, message: any) {
    // TODO: Implement WebSocket notification
    console.log(`Would notify clients for group ${groupId}:`, message)
  }

  // Get all active polling groups
  getActiveGroups(): string[] {
    return Array.from(this.activePolls.keys())
  }

  // Stop all polling (for cleanup)
  stopAllPolling() {
    console.log('Stopping all Spotify polling')
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