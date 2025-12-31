// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  nitro: {
    routeRules: {
      '/api/scan': {
        // 30 second timeout for file scanning
        timeout: 30000
      }
    }
  }
})
