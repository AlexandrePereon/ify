import SpotifyWebApi from 'spotify-web-api-node'

export class SpotifyService {
  private api: SpotifyWebApi

  constructor(accessToken: string) {
    this.api = new SpotifyWebApi({
      clientId: useRuntimeConfig().spotifyClientId,
      clientSecret: useRuntimeConfig().spotifyClientSecret,
      accessToken
    })
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await this.api.getMe()
      return response.body
    } catch (error) {
      console.error('Error getting current user:', error)
      throw error
    }
  }

  // Get current playback state
  async getCurrentPlayback() {
    try {
      const response = await this.api.getMyCurrentPlaybackState()
      return response.body
    } catch (error) {
      console.error('Error getting playback state:', error)
      throw error
    }
  }

  // Search tracks
  async searchTracks(query: string, limit = 20) {
    try {
      const response = await this.api.searchTracks(query, { limit })
      return response.body.tracks?.items || []
    } catch (error) {
      console.error('Error searching tracks:', error)
      throw error
    }
  }

  // Add track to queue
  async addToQueue(trackUri: string) {
    try {
      await this.api.addToQueue(trackUri)
      return true
    } catch (error) {
      console.error('Error adding to queue:', error)
      throw error
    }
  }

  // Skip to next track
  async skipToNext() {
    try {
      await this.api.skipToNext()
      return true
    } catch (error) {
      console.error('Error skipping track:', error)
      throw error
    }
  }

  // Get user's devices
  async getDevices() {
    try {
      const response = await this.api.getMyDevices()
      return response.body.devices
    } catch (error) {
      console.error('Error getting devices:', error)
      throw error
    }
  }
}