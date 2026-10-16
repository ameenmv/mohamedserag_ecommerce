import { createHash, timingSafeEqual } from 'node:crypto'
import { ALL_PERMISSIONS, type Permission } from '@serag/shared'
import type { CookieOptions } from 'express'

export const SESSION_COOKIE_NAME = 'serag_sid'
export const CSRF_HEADER_NAME = 'x-csrf-token'
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const SESSION_EXTEND_THRESHOLD_MS = 60 * 60 * 1000

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const VALID_PERMISSIONS = new Set<string>(ALL_PERMISSIONS)

/**
 * Hashes a raw opaque session token with SHA-256 and returns the lowercase hex digest.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Builds cookie options for the `serag_sid` session cookie.
 */
export function getSessionCookieOptions(
  isProduction: boolean = process.env.NODE_ENV === 'production',
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}

/**
 * Returns true if the HTTP method is considered safe (non-mutating).
 */
export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase())
}

/**
 * Verifies the `x-csrf-token` header value against the session's `csrfToken` for mutating requests.
 */
export function verifyCsrfToken(
  method: string,
  headerToken: string | string[] | undefined,
  sessionCsrfToken: string,
): boolean {
  if (isSafeMethod(method)) {
    return true
  }
  if (typeof headerToken !== 'string' || headerToken.length === 0 || sessionCsrfToken.length === 0) {
    return false
  }
  const headerBuf = Buffer.from(headerToken, 'utf8')
  const sessionBuf = Buffer.from(sessionCsrfToken, 'utf8')
  if (headerBuf.length !== sessionBuf.length) {
    return false
  }
  return timingSafeEqual(headerBuf, sessionBuf)
}

/**
 * Checks whether a request targets an `/api/admin` route.
 */
export function isAdminRoute(req: {
  path?: string
  originalUrl?: string
  url?: string
}): boolean {
  const rawPath = req.path || req.originalUrl || req.url || ''
  const pathOnly = rawPath.split('?')[0] ?? ''
  return pathOnly === '/api/admin' || pathOnly.startsWith('/api/admin/')
}

export interface UserRoleWithPermissions {
  role: {
    permissions: Array<{
      permission: {
        key: string
      }
    }>
  }
}

/**
 * Extracts the set of valid `Permission` keys from a user's joined `UserRole -> RolePermission -> Permission` records.
 */
export function extractPermissions(roles: readonly UserRoleWithPermissions[]): Set<Permission> {
  const permissions = new Set<Permission>()
  for (const userRole of roles) {
    for (const rp of userRole.role.permissions) {
      if (VALID_PERMISSIONS.has(rp.permission.key)) {
        permissions.add(rp.permission.key as Permission)
      }
    }
  }
  return permissions
}
