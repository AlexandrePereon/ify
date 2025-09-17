import SpotifyProvider from '@auth/core/providers/spotify'
import CredentialsProvider from '@auth/core/providers/credentials'
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
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Guest',
      credentials: {
        user: { label: "User", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.user) {
          const userData = JSON.parse(credentials.user as string)
          return userData
        }
        return null
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, account, user }) => {
      if (account) {
        if (account.provider === 'spotify') {
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
        }
      }
      
      // For guest users, preserve user data
      if (user && user.type === 'guest') {
        token.id = user.id
        token.type = user.type
        token.groupId = user.groupId
        token.groupCode = user.groupCode
      }
      
      return token
    },
    session: async ({ session, token }: any) => {
      if (token.type === 'guest') {
        session.user.id = token.id
        session.user.type = token.type
        session.user.groupId = token.groupId
        session.user.groupCode = token.groupCode
      } else {
        session.accessToken = token.accessToken
        session.refreshToken = token.refreshToken
      }
      return session
    }
  },
}) as any