import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// Absolute, because IPX resolves a relative dir from its own build output, not from this app.
const uploadsDir = process.env.UPLOADS_DIR || fileURLToPath(new URL('../../uploads', import.meta.url))

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
      // Public origin used for canonical URLs, sitemap, robots and JSON-LD.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      // 'true' only on the production origin; otherwise robots.txt answers `Disallow: /`.
      siteIndexable: process.env.NUXT_PUBLIC_SITE_INDEXABLE || 'false',
      umamiHost: '',
      umamiWebsiteId: '',
      // Only populated in nuxt dev via $development; empty in production.
      devLogin: {
        email: '',
        password: '',
      },
    },
  },

  // Only the body text weight is preloaded: on a slow phone connection every preloaded font
  // competes with the CSS and entry JS before first paint. The others swap in when they arrive.
  fonts: {
    families: [
      {
        name: 'IBM Plex Sans Arabic',
        provider: 'google',
        weights: [400, 700],
        subsets: ['arabic'],
        preload: { weights: [400] },
      },
      {
        name: 'Lalezar',
        provider: 'google',
        weights: [400],
        // Latin too: the Arabic subset has no digits («4 خطوات بس», headline numbers)
        subsets: ['arabic', 'latin'],
        preload: false,
      },
      {
        name: 'Outfit',
        provider: 'google',
        weights: [400, 500, 600, 700, 800],
        subsets: ['latin'],
        preload: false,
      },
    ],
  },

  experimental: {
    defaults: {
      // Prefetch a page's code when its link is hovered or focused, not as soon as it scrolls into
      // view: listings show dozens of links, and loading (and running) every target page's chunks
      // at once cost ~0.5 s of main-thread time on mobile (Lighthouse TBT).
      nuxtLink: { prefetchOn: { interaction: true, visibility: false } },
    },
  },

  hooks: {
    // Fewer tiny chunks = fewer requests before first paint.
    'vite:extendConfig'(config, { isClient }) {
      if (isClient) {
        const build = config.build ?? Object.assign(config, { build: {} }).build
        build.rolldownOptions = build.rolldownOptions || {}
        const output = (build.rolldownOptions.output = build.rolldownOptions.output || {})
        const codeSplitting = {
          minSize: 20000,
          groups: [
            {
              name: 'framework',
              test: /[\\/]node_modules[\\/](?:@vue[\\/]|vue[\\/]|vue-router[\\/]|@unhead[\\/]|unhead[\\/]|@intlify[\\/]|vue-i18n[\\/])/,
              priority: 1,
            },
            {
              // Every Lucide icon was its own ~300-byte chunk (66 of them, 4.9 KB gzipped together):
              // one request instead of dozens on listing and product pages.
              name: 'icons',
              test: /[\\/]node_modules[\\/]@lucide[\\/]/,
              priority: 1,
            },
          ],
        }
        if (Array.isArray(output)) {
          for (const o of output) {
            o.codeSplitting = codeSplitting
          }
        } else {
          output.codeSplitting = codeSplitting
        }
      }
    },
    // Prefetch hints for lazy chunks compete with first paint; NuxtLink prefetches on interaction (see experimental).
    'build:manifest'(manifest) {
      for (const key in manifest) {
        const file = manifest[key]
        if (file) {
          file.prefetch = false
          // No <link rel="modulepreload"> for non-entry chunks: on slow connections 40+ preloads
          // competed with CSS/fonts before first paint. The entry still imports them right after.
          if (!file.isEntry) file.preload = false
        }
      }
    },
  },

  // Dev only: serve the shared uploads folder at /uploads (Caddy serves it in production).
  nitro: {
    // Serve prebuilt gzip/brotli JS and CSS; Caddy compresses in production, this covers the bare node server.
    compressPublicAssets: { gzip: true, brotli: true },
    publicAssets: [{ dir: uploadsDir, baseURL: '/uploads', maxAge: 3600 }],
  },

  image: {
    // Uploaded product images live on the shared `uploads` volume (see docker/compose.yml).
    ipx: { fs: { dir: uploadsDir } },
    // Stored URLs are `/uploads/...`; IPX reads from inside the uploads folder, so strip the prefix.
    alias: { '/uploads': '/' },
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
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  typescript: { strict: true },

  routeRules: {
    '/': { swr: 60 },
    '/en': { swr: 60 },
    '/sitemap.xml': { swr: 3600 },
    '/robots.txt': { swr: 3600 },
    '/feeds/google.xml': { swr: 3600 },
  },
})
