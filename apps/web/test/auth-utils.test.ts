import { describe, expect, it } from 'vitest'
import { getErrorStatus, isUnauthorizedError } from '../app/utils/api'
import {
  isValidEmail,
  loginErrorKey,
  resolveNextPath,
} from '../app/utils/auth'

describe('resolveNextPath', () => {
  it('falls back to /admin for non-string values', () => {
    expect(resolveNextPath(null)).toBe('/admin')
    expect(resolveNextPath(undefined)).toBe('/admin')
    expect(resolveNextPath(123)).toBe('/admin')
    expect(resolveNextPath({})).toBe('/admin')
    expect(resolveNextPath(['/admin/orders'])).toBe('/admin')
    expect(resolveNextPath(null, '/en/admin')).toBe('/en/admin')
  })

  it('rejects protocol-relative and open redirect URLs like //evil', () => {
    expect(resolveNextPath('//evil')).toBe('/admin')
    expect(resolveNextPath('//evil.com/admin')).toBe('/admin')
    expect(resolveNextPath('//evil.com/en/admin')).toBe('/admin')
  })

  it('rejects loopback to login page in Arabic and English locales', () => {
    expect(resolveNextPath('/admin/login')).toBe('/admin')
    expect(resolveNextPath('/admin/login?next=/admin/orders')).toBe('/admin')
    expect(resolveNextPath('/en/admin/login')).toBe('/admin')
    expect(resolveNextPath('/en/admin/login?next=/en/admin/orders')).toBe('/admin')
  })

  it('rejects paths outside /admin such as /shop or /', () => {
    expect(resolveNextPath('/shop')).toBe('/admin')
    expect(resolveNextPath('/')).toBe('/admin')
    expect(resolveNextPath('/bridal')).toBe('/admin')
    expect(resolveNextPath('/en/shop')).toBe('/admin')
    expect(resolveNextPath('/en')).toBe('/admin')
    expect(resolveNextPath('https://external.com')).toBe('/admin')
  })

  it('accepts valid admin destination paths in Arabic and English', () => {
    expect(resolveNextPath('/admin/orders')).toBe('/admin/orders')
    expect(resolveNextPath('/admin/products?filter=active')).toBe('/admin/products?filter=active')
    expect(resolveNextPath('/admin')).toBe('/admin')
    expect(resolveNextPath('/en/admin/orders')).toBe('/en/admin/orders')
    expect(resolveNextPath('/en/admin/products?filter=active')).toBe('/en/admin/products?filter=active')
    expect(resolveNextPath('/en/admin')).toBe('/en/admin')
  })
})

describe('isValidEmail', () => {
  it('returns true for valid email formats', () => {
    expect(isValidEmail('admin@serag.local')).toBe(true)
    expect(isValidEmail('test.user@domain.co')).toBe(true)
    expect(isValidEmail('  user@store.eg  ')).toBe(true)
  })

  it('returns false for invalid email formats or empty strings', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
    expect(isValidEmail('admin')).toBe(false)
    expect(isValidEmail('admin@')).toBe(false)
    expect(isValidEmail('@serag.co')).toBe(false)
    expect(isValidEmail('admin@domain')).toBe(false)
    expect(isValidEmail('admin with space@domain.com')).toBe(false)
  })
})

describe('loginErrorKey', () => {
  it('returns admin.login.errors.invalidCredentials for 400 and 401 status codes', () => {
    expect(loginErrorKey({ statusCode: 401 })).toBe('admin.login.errors.invalidCredentials')
    expect(loginErrorKey({ status: 401 })).toBe('admin.login.errors.invalidCredentials')
    expect(loginErrorKey({ response: { status: 401 } })).toBe('admin.login.errors.invalidCredentials')
    expect(loginErrorKey({ statusCode: 400 })).toBe('admin.login.errors.invalidCredentials')
    expect(loginErrorKey({ status: 400 })).toBe('admin.login.errors.invalidCredentials')
    expect(loginErrorKey({ response: { status: 400 } })).toBe('admin.login.errors.invalidCredentials')
  })

  it('returns admin.login.errors.tooManyAttempts for 429 status code', () => {
    expect(loginErrorKey({ statusCode: 429 })).toBe('admin.login.errors.tooManyAttempts')
    expect(loginErrorKey({ status: 429 })).toBe('admin.login.errors.tooManyAttempts')
    expect(loginErrorKey({ response: { status: 429 } })).toBe('admin.login.errors.tooManyAttempts')
  })

  it('falls back to errors.generic for other status codes or unknown errors', () => {
    expect(loginErrorKey(null)).toBe('errors.generic')
    expect(loginErrorKey(undefined)).toBe('errors.generic')
    expect(loginErrorKey({})).toBe('errors.generic')
    expect(loginErrorKey(new Error('Network error'))).toBe('errors.generic')
    expect(loginErrorKey({ statusCode: 500 })).toBe('errors.generic')
    expect(loginErrorKey({ status: 503 })).toBe('errors.generic')
  })
})

describe('getErrorStatus', () => {
  it('extracts status code from statusCode, status, or response.status', () => {
    expect(getErrorStatus({ statusCode: 404 })).toBe(404)
    expect(getErrorStatus({ status: 500 })).toBe(500)
    expect(getErrorStatus({ response: { status: 401 } })).toBe(401)
  })

  it('returns undefined for non-objects or objects without status properties', () => {
    expect(getErrorStatus(null)).toBeUndefined()
    expect(getErrorStatus(undefined)).toBeUndefined()
    expect(getErrorStatus('error')).toBeUndefined()
    expect(getErrorStatus({})).toBeUndefined()
  })
})

describe('isUnauthorizedError', () => {
  it('returns true only for status 401', () => {
    expect(isUnauthorizedError({ statusCode: 401 })).toBe(true)
    expect(isUnauthorizedError({ status: 401 })).toBe(true)
    expect(isUnauthorizedError({ response: { status: 401 } })).toBe(true)
    expect(isUnauthorizedError({ statusCode: 403 })).toBe(false)
    expect(isUnauthorizedError({ statusCode: 500 })).toBe(false)
    expect(isUnauthorizedError(null)).toBe(false)
  })
})
