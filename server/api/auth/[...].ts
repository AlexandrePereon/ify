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
        if (!credentials?.user) return null

        let userData: any
        try {
          userData = JSON.parse(credentials.user as string)
        } catch {
          return null
        }

        // Credentials login is ONLY for guests. Reject anything that tries to
        // claim another identity (e.g. an admin email) or a forged shape.
        if (
          !userData ||
          userData.type !== 'guest' ||
          typeof userData.id !== 'string' ||
          !userData.id.startsWith('guest_') ||
          !userData.groupId
        ) {
          return null
        }

        // The guest must already exist as a member of the target group
        // (added server-side by /api/auth/guest). Rebuild the identity from
        // the stored member so the client cannot spoof name/id/group.
        const { groupService } = await import('~/server/services/groups')
        const group = groupService.getGroup(userData.groupId)
        if (!group) return null

        const member = group.members.find((m: any) => m.id === userData.id)
        if (!member || member.id === group.admin.id) return null

        // The secret proves this login belongs to the guest that was minted
        // server-side — a leaked/guessed guest id alone is not enough.
        if (!groupService.verifyGuestSecret(group.id, member.id, userData.secret)) {
          return null
        }

        return {
          id: member.id,
          name: member.name,
          type: 'guest',
          groupId: group.id,
          groupCode: group.code,
          image: null
        } as any
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