import type { ErrorEvent } from '@sentry/nestjs'
import { redactPii } from './redact-pii.js'

/**
 * Removes everything that could identify a customer before an event leaves the server: the
 * request body, cookies, headers and query string, the user's details, and phone-like digits or tokens in
 * the exception messages (same masking as the redacted error log).
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    delete event.request.query_string
  }
  // Only the opaque admin id may stay; never a name, email or address
  if (event.user?.id) event.user = { id: event.user.id }
  else delete event.user

  if (event.message) event.message = redactPii(event.message)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactPii(exception.value)
  }
  return event
}
