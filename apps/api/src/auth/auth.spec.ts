import { type ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS, type Permission } from '@serag/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  type AdminContext,
  IS_ANY_ADMIN_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './decorators.js'
import { PermissionGuard } from './permission.guard.js'
import {
  extractPermissions,
  hashSessionToken,
  isAdminRoute,
  verifyCsrfToken,
} from './session.util.js'

function createMockContext(options: {
  path: string
  admin?: AdminContext
  handlerName?: string
  className?: string
}): ExecutionContext {
  const handler = Object.defineProperty(() => undefined, 'name', {
    value: options.handlerName ?? 'updateOrder',
  })
  const cls = Object.defineProperty(class {}, 'name', {
    value: options.className ?? 'OrdersAdminController',
  })
  const req = {
    path: options.path,
    originalUrl: options.path,
    url: options.path,
    admin: options.admin,
  }
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext
}

function makeAdmin(permissions: Permission[]): AdminContext {
  return {
    userId: 'user-1',
    name: 'محمد سراج',
    email: 'admin@serag.co',
    permissions: new Set(permissions),
    sessionId: 'sess-hash-1',
  }
}

describe('hashSessionToken', () => {
  it('returns a deterministic 64-character hex SHA-256 hash', () => {
    const raw = 'a'.repeat(48)
    const hashed = hashSessionToken(raw)
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
    expect(hashed).not.toBe(raw)
    expect(hashSessionToken(raw)).toBe(hashed)
    expect(hashSessionToken('b'.repeat(48))).not.toBe(hashed)
  })
})

describe('verifyCsrfToken', () => {
  const sessionToken = 'csrf-secret-token-1234567890123456'

  it('allows safe methods (GET, HEAD, OPTIONS) even without a header', () => {
    expect(verifyCsrfToken('GET', undefined, sessionToken)).toBe(true)
    expect(verifyCsrfToken('get', '', sessionToken)).toBe(true)
    expect(verifyCsrfToken('HEAD', undefined, sessionToken)).toBe(true)
    expect(verifyCsrfToken('OPTIONS', undefined, sessionToken)).toBe(true)
  })

  it('rejects mutating requests when header is missing, empty, array, or mismatched', () => {
    expect(verifyCsrfToken('POST', undefined, sessionToken)).toBe(false)
    expect(verifyCsrfToken('POST', '', sessionToken)).toBe(false)
    expect(verifyCsrfToken('PATCH', [sessionToken], sessionToken)).toBe(false)
    expect(verifyCsrfToken('DELETE', 'wrong-token', sessionToken)).toBe(false)
    expect(verifyCsrfToken('PUT', 'csrf-secret-token-1234567890123457', sessionToken)).toBe(false)
  })

  it('allows mutating requests when x-csrf-token matches the session token', () => {
    expect(verifyCsrfToken('POST', sessionToken, sessionToken)).toBe(true)
    expect(verifyCsrfToken('PATCH', sessionToken, sessionToken)).toBe(true)
    expect(verifyCsrfToken('DELETE', sessionToken, sessionToken)).toBe(true)
  })
})

describe('isAdminRoute & extractPermissions', () => {
  it('detects /api/admin routes and ignores public routes', () => {
    expect(isAdminRoute({ path: '/api/admin/orders' })).toBe(true)
    expect(isAdminRoute({ path: '/api/admin' })).toBe(true)
    expect(isAdminRoute({ originalUrl: '/api/admin/auth/me?foo=1' })).toBe(true)
    expect(isAdminRoute({ path: '/api/health' })).toBe(false)
    expect(isAdminRoute({ path: '/api/products' })).toBe(false)
  })

  it('extracts valid permission keys from nested UserRole records', () => {
    const perms = extractPermissions([
      {
        role: {
          permissions: [
            { permission: { key: PERMISSIONS.orders.read } },
            { permission: { key: PERMISSIONS.orders.update } },
            { permission: { key: 'unknown.invalid' } },
          ],
        },
      },
    ])
    expect(Array.from(perms)).toEqual([PERMISSIONS.orders.read, PERMISSIONS.orders.update])
  })
})

describe('PermissionGuard', () => {
  it('allows non-admin routes without metadata or admin context', () => {
    const reflector = new Reflector()
    const guard = new PermissionGuard(reflector)
    const ctx = createMockContext({ path: '/api/health' })
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('fails closed (403) and logs a warning when an admin handler has no permission metadata', () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const guard = new PermissionGuard(reflector)
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    const ctx = createMockContext({
      path: '/api/admin/orders',
      admin: makeAdmin([PERMISSIONS.orders.read]),
      className: 'OrdersAdminController',
      handlerName: 'listOrders',
    })

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('OrdersAdminController.listOrders'),
    )
    warnSpy.mockRestore()
  })

  it('denies (403) when the admin user is missing a required permission key', () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRED_PERMISSIONS_KEY) {
        return [PERMISSIONS.orders.read, PERMISSIONS.orders.update]
      }
      return false
    })
    const guard = new PermissionGuard(reflector)
    const ctx = createMockContext({
      path: '/api/admin/orders/123',
      admin: makeAdmin([PERMISSIONS.orders.read]),
    })

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('allows when the admin user has all required permission keys', () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRED_PERMISSIONS_KEY) {
        return [PERMISSIONS.orders.read, PERMISSIONS.orders.update]
      }
      return false
    })
    const guard = new PermissionGuard(reflector)
    const ctx = createMockContext({
      path: '/api/admin/orders/123',
      admin: makeAdmin([
        PERMISSIONS.orders.read,
        PERMISSIONS.orders.update,
        PERMISSIONS.products.read,
      ]),
    })

    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('allows @Public() and @AnyAdmin() handlers appropriately', () => {
    const reflector = new Reflector()
    const spy = vi.spyOn(reflector, 'getAllAndOverride')
    const guard = new PermissionGuard(reflector)

    spy.mockImplementation((key) => key === IS_PUBLIC_KEY)
    const publicCtx = createMockContext({ path: '/api/admin/auth/login' })
    expect(guard.canActivate(publicCtx)).toBe(true)

    spy.mockImplementation((key) => key === IS_ANY_ADMIN_KEY)
    const anyAdminCtx = createMockContext({
      path: '/api/admin/auth/me',
      admin: makeAdmin([]),
    })
    expect(guard.canActivate(anyAdminCtx)).toBe(true)
  })
})
