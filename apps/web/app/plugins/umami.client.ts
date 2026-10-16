import { globalAnalyticsQueue } from '../utils/analytics-queue'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const umamiHost = config.public.umamiHost?.trim()
  const umamiWebsiteId = config.public.umamiWebsiteId?.trim()

  // 1. Both umamiHost and umamiWebsiteId must be non-empty.
  // In development, runtimeConfig defaults both to empty strings, so the tracker
  // is never injected unless explicitly configured via environment variables.
  if (!umamiHost || !umamiWebsiteId) {
    return
  }

  // 2. Normalize host URL (remove trailing slash)
  const cleanHost = umamiHost.replace(/\/+$/, '')
  const scriptSrc = `${cleanHost}/script.js`

  // Optional domains configuration if provided
  const rawDomains = (config.public as Record<string, unknown>).umamiDomains
  const domains = typeof rawDomains === 'string' && rawDomains.trim() ? rawDomains.trim() : undefined

  // Helper to flush queued events when the global tracker instance is ready
  function flushWhenReady(): boolean {
    if (window.umami && typeof window.umami.track === 'function') {
      globalAnalyticsQueue.flush(window.umami)
      return true
    }
    return false
  }

  // 3. Inject cookie-less Umami script via useHead
  useHead({
    script: [
      {
        src: scriptSrc,
        defer: true,
        'data-website-id': umamiWebsiteId,
        'data-do-not-track': 'true',
        ...(domains ? { 'data-domains': domains } : {}),
        onload: () => {
          if (!flushWhenReady()) {
            // Check briefly in case window.umami takes an extra tick to attach
            const interval = setInterval(() => {
              if (flushWhenReady()) {
                clearInterval(interval)
              }
            }, 50)
            setTimeout(() => clearInterval(interval), 2000)
          }
        },
      },
    ],
  })
})
