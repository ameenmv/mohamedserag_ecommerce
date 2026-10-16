import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/image', '@nuxtjs/i18n', 'shadcn-nuxt'],

  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      titleTemplate: '%s · محمد سراج',
      meta: [{ name: 'theme-color', content: '#16291E' }],
    },
  },

  runtimeConfig: {
    // Server-side (SSR) calls go straight to the API container.
    apiInternalBase: 'http://localhost:4000/api',
    public: {
      apiBase: 'http://localhost:4000/api',
      umamiHost: '',
      umamiWebsiteId: '',
    },
  },

  fonts: {
    families: [
      { name: 'IBM Plex Sans Arabic', provider: 'google', weights: [400, 500, 600, 700], subsets: ['arabic', 'latin'] },
      { name: 'Lalezar', provider: 'google', weights: [400], subsets: ['arabic', 'latin'] },
      { name: 'Outfit', provider: 'google', weights: [400, 500, 600, 700, 800], subsets: ['latin'] },
    ],
  },

  image: {
    // Uploaded product images live on the shared `uploads` volume (see docker/compose.yml).
    ipx: { fs: { dir: process.env.UPLOADS_DIR || '../../uploads' } },
    formats: ['avif', 'webp'],
  },

  i18n: {
    defaultLocale: 'ar',
    strategy: 'no_prefix',
    locales: [{ code: 'ar', language: 'ar-EG', dir: 'rtl', file: 'ar.json' }],
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  typescript: { strict: true },
})
