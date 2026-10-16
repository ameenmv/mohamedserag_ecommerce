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
      meta: [{ name: 'theme-color', content: '#16291E' }],
    },
  },

  $development: {
    runtimeConfig: {
      public: {
        // Prefilled admin credentials only populated in `nuxt dev`.
        devLogin: {
          email: process.env.ADMIN_EMAIL ?? 'admin@serag.local',
          password: process.env.ADMIN_PASSWORD ?? 'change-me',
        },
      },
    },
  },

  runtimeConfig: {
    // Server-side (SSR) calls go straight to the API container.
    apiInternalBase: 'http://localhost:4000/api',
    public: {
      apiBase: 'http://localhost:4000/api',
      umamiHost: '',
      umamiWebsiteId: '',
      // Only populated in nuxt dev via $development; empty in production.
      devLogin: {
        email: '',
        password: '',
      },
    },
  },

  fonts: {
    families: [
      { name: 'IBM Plex Sans Arabic', provider: 'google', weights: [400, 500, 600, 700], subsets: ['arabic'], preload: true },
      { name: 'Lalezar', provider: 'google', weights: [400], subsets: ['arabic'], preload: true },
      { name: 'Outfit', provider: 'google', weights: [400, 500, 600, 700, 800], subsets: ['latin'], preload: false },
    ],
  },

  // Dev only: serve the shared uploads folder at /uploads (Caddy serves it in production).
  nitro: {
    // Serve prebuilt gzip/brotli JS and CSS; Caddy compresses in production, this covers the bare node server.
    compressPublicAssets: { gzip: true, brotli: true },
    publicAssets: [{ dir: process.env.UPLOADS_DIR || '../../uploads', baseURL: '/uploads', maxAge: 3600 }],
  },

  image: {
    // Uploaded product images live on the shared `uploads` volume (see docker/compose.yml).
    ipx: { fs: { dir: process.env.UPLOADS_DIR || '../../uploads' } },
    format: ['avif', 'webp'],
  },

  i18n: {
    defaultLocale: 'ar',
    strategy: 'prefix_except_default',
    baseUrl: process.env.BASE_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locales: [
      { code: 'ar', language: 'ar-EG', dir: 'rtl', name: 'العربية', file: 'ar.json' },
      { code: 'en', language: 'en-US', dir: 'ltr', name: 'English', file: 'en.json' },
    ],
    // Arabic-first store: '/' is always Arabic; English only via explicit /en links.
    detectBrowserLanguage: false,
    bundle: {
      dropMessageCompiler: true,
      fullInstall: false,
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  typescript: { strict: true },
})
