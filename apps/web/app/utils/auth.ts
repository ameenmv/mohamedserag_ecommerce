import { getErrorStatus } from './api'
import { stripLocalePrefix } from './i18n'

/**
 * Safely resolves the `next` redirect path after admin login.
 * Prevents open redirect vulnerabilities, protocol-relative URLs (`//`),
 * non-admin routes, and loops back into the login screen itself in both Arabic and English locales.
 */
export function resolveNextPath(raw: unknown, fallback = '/admin'): string {
  if (typeof raw !== 'string') return fallback
  if (raw.startsWith('//')) return fallback

  const pathname = raw.split('?')[0] ?? raw
  const base = stripLocalePrefix(pathname)

  if (/^\/admin(\/|$)/.test(base) && !/^\/admin\/login(\/|$)/.test(base)) {
    return raw
  }

  return fallback
}

/**
 * Validates a basic email address pattern without whitespace.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

/**
 * Maps an API error payload or status code to a localized i18n translation key.
 * Returns 'admin.login.errors.invalidCredentials' for status 400/401,
 * 'admin.login.errors.tooManyAttempts' for 429, else 'errors.generic'.
 */
export function loginErrorKey(err: unknown): string {
  const status = getErrorStatus(err)

  if (status === 400 || status === 401) {
    return 'admin.login.errors.invalidCredentials'
  }

  if (status === 429) {
    return 'admin.login.errors.tooManyAttempts'
  }

  return 'errors.generic'
}
