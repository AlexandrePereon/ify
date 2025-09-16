// https://nuxt.com/docs/api/configuration/nuxt-config
console.log('🚀 NUXT CONFIG DEBUG:')
console.log('- AUTH_ORIGIN:', process.env.AUTH_ORIGIN)
console.log('- NUXT_AUTH_SECRET:', process.env.NUXT_AUTH_SECRET ? '✅ Set' : '❌ Missing')
console.log('- NUXT_SPOTIFY_CLIENT_ID:', process.env.NUXT_SPOTIFY_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('- NUXT_SPOTIFY_CLIENT_SECRET:', process.env.NUXT_SPOTIFY_CLIENT_SECRET ? '✅ Set' : '❌ Missing')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'nuxt-qrcode',
    '@sidebase/nuxt-auth'
  ],

  css: ['~/assets/css/main.css'],

  auth: {
    baseURL: '/api/auth',
    provider: {
      type: 'authjs'
    }
  },

  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    spotifyClientId: process.env.NUXT_SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.NUXT_SPOTIFY_CLIENT_SECRET,
    public: {
      authUrl: process.env.NEXT_PUBLIC_AUTH_URL
    }
  },

  app: {
    head: {
      title: 'IFY - Spotify Group Listening',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#22c55e' }
      ]
    }
  }
})