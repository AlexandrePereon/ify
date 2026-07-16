// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode: IFY is a fully interactive real-time app (SSE, EventSource,
  // client-driven auth). Disabling SSR avoids @sidebase/nuxt-auth's server-side
  // self-fetch to /api/auth/session, which is unreachable from inside a
  // container behind a reverse proxy. Nitro still serves all API routes + SSE.
  ssr: false,

  devServer: {
    host: '127.0.0.1',
    port: 3001
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'nuxt-qrcode',
    '@sidebase/nuxt-auth',
    '@nuxtjs/device'
  ],

  css: ['~/assets/css/main.css'],

  auth: {
    provider: {
      type: 'authjs'
    }
  },

  runtimeConfig: {
    authOrigin: process.env.NUXT_AUTH_ORIGIN,
    authSecret: process.env.NUXT_AUTH_SECRET,
    spotifyClientId: process.env.NUXT_SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.NUXT_SPOTIFY_CLIENT_SECRET,
    public: {
      authUrl: process.env.NEXT_PUBLIC_AUTH_URL
    }
  },

  app: {
    head: {
      title: 'IFY - Listen to Spotify Together',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1DB954' }
      ]
    }
  }
})