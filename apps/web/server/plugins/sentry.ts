import * as Sentry from '@sentry/node'
import { buildSentryContext } from '../utils/sentry-context'
import { scrubSentryEvent } from '../utils/sentry-scrub'

// Server-side error tracking only (render and route errors): nothing is added to the browser
// bundle, so page speed is untouched. Off unless NUXT_SENTRY_DSN is set.
export default defineNitroPlugin((nitroApp) => {
  const dsn = String(useRuntimeConfig().sentryDsn ?? '').trim()
  if (!dsn) return

  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE || undefined,
    serverName: 'serag-web',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    beforeSend: scrubSentryEvent,
  })

  nitroApp.hooks.hook('error', (error, context) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500) return // 404s and other client errors are not bugs
    const ctx = buildSentryContext(context?.event?.method, context?.event?.path, status)
    Sentry.withScope((scope) => {
      scope.setTransactionName(ctx.transaction)
      scope.setTags(ctx.tags)
      scope.setContext('request', ctx.request)
      Sentry.captureException(error)
    })
  })
})
