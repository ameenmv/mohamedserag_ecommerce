import type { ErrorEvent } from '@sentry/node'

/** Masks phone-like digit runs and bearer/token values, and caps the length. */
function redact(text: string): string {
  return text
    .replace(/(Bearer\s+)["']?[^\s,;'"]+["']?/gi, '$1[REDACTED]')
    .replace(/(token=)["']?[^\s,;'"]+["']?/gi, '$1[REDACTED]')
    .replace(/\d{7,}/g, '[REDACTED]')
    .slice(0, 300)
}

/**
 * Removes everything that could identify a visitor before an event leaves the server: the request
 * body, cookies, headers and query string, the user, and personal data in exception messages.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    delete event.request.query_string
  }
  delete event.user
  if (event.message) event.message = redact(event.message)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redact(exception.value)
  }
  return event
}
