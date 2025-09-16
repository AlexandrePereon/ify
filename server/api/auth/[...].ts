import SpotifyProvider from '@auth/core/providers/spotify'
import { NuxtAuthHandler } from '#auth'

const config = useRuntimeConfig()

console.log('🔧 AUTH CONFIG DEBUG:')
console.log('- authSecret:', config.authSecret ? '✅ Set' : '❌ Missing')
console.log('- spotifyClientId:', config.spotifyClientId ? '✅ Set' : '❌ Missing')
console.log('- spotifyClientSecret:', config.spotifyClientSecret ? '✅ Set' : '❌ Missing')

export default NuxtAuthHandler({
  secret: config.authSecret,
  debug: true,
  providers: [
    SpotifyProvider({
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private streaming user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative user-library-read'
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, account }) => {
      console.log('🔐 JWT Callback:', { hasToken: !!token, hasAccount: !!account })
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        console.log('✅ JWT: Saved tokens to JWT')
      }
      return token
    },
    session: async ({ session, token }: any) => {
      console.log('👤 Session Callback:', { hasSession: !!session, hasToken: !!token })
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      console.log('✅ Session: Added tokens to session')
      return session
    }
  },
  events: {
    async signIn(message) {
      console.log('🔑 SignIn Event:', message)
    },
    async session(message) {
      console.log('📱 Session Event:', message)
    }
  }
}) as any