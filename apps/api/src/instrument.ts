// Imported first in main.ts so Sentry starts before the rest of the app loads.
// Off unless SENTRY_DSN is set; errors only (no tracing; PII is off by default and scrubbed anyway).
import * as Sentry from '@sentry/nestjs'
import { scrubSentryEvent } from './common/sentry-scrub.js'

const dsn = process.env.SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE || undefined,
    serverName: 'serag-api',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    beforeSend: scrubSentryEvent,
  })
}
