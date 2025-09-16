import SpotifyProvider from '@auth/core/providers/spotify'
import { NuxtAuthHandler } from '#auth'

const config = useRuntimeConfig()

export default NuxtAuthHandler({
  secret: config.authSecret,
  debug: false,
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
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    session: async ({ session, token }: any) => {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    }
  },
}) as any