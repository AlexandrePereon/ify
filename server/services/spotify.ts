export class SpotifyService {
  private accessToken: string
  private refreshToken: string
  private groupId: string
  private clientId: string
  private clientSecret: string
  private baseUrl = 'https://api.spotify.com/v1'

  constructor(accessToken: string, refreshToken: string, groupId: string) {
    const config = useRuntimeConfig()
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.groupId = groupId
    this.clientId = config.spotifyClientId
    this.clientSecret = config.spotifyClientSecret
  }

  // Handle token refresh when needed
  private async handleTokenRefresh(response: Response) {
    if (response.status === 401) {
      try {
        const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
          })
        })
        
        if (!refreshResponse.ok) {
          throw new Error(`Token refresh failed: ${refreshResponse.status}`)
        }
        
        const data = await refreshResponse.json()
        const newAccessToken = data.access_token
        
        // Update instance token
        this.accessToken = newAccessToken
        
        // Update the group's stored token
        const { groupService } = await import('./groups.js')
        const group = groupService.getGroup(this.groupId)
        if (group) {
          group.admin.spotifyTokens.accessToken = newAccessToken
        }
        
        return true
      } catch (refreshError) {
        return false
      }
    }
    return false
  }

  // Make authenticated request to Spotify API
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.handleTokenRefresh(response)
        if (refreshed) {
          // Retry with new token
          return this.makeRequest(endpoint, options)
        }
      }
      
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
    }
    
    if (response.status === 204) {
      return null as T
    }
    
    return response.json()
  }

  // Get current user
  async getCurrentUser() {
    return this.makeRequest('/me')
  }

  // Get current playback state
  async getCurrentPlayback() {
    try {
      return await this.makeRequest('/me/player')
    } catch (error) {
      if (error.message.includes('404')) {
        return null // No active device
      }
      throw error
    }
  }

  // Search tracks
  async searchTracks(query: string, limit = 20) {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString()
    })
    
    const response = await this.makeRequest<any>(`/search?${params}`)
    return response.tracks?.items || []
  }

  // Add track to queue
  async addToQueue(trackUri: string) {
    const params = new URLSearchParams({ uri: trackUri })
    await this.makeRequest(`/me/player/queue?${params}`, { method: 'POST' })
    return true
  }

  // Skip to next track
  async skipToNext() {
    await this.makeRequest('/me/player/next', { method: 'POST' })
    return true
  }

  // Get user's devices
  async getDevices() {
    const response = await this.makeRequest<any>('/me/player/devices')
    return response.devices || []
  }

  // Get user's queue
  async getQueue() {
    try {
      return await this.makeRequest('/me/player/queue')
    } catch (error) {
      if (error.message.includes('404')) {
        return {
          queue: [],
          currently_playing: null
        }
      }
      throw error
    }
  }
}