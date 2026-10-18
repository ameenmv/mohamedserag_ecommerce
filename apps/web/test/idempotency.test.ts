import { describe, expect, it, vi } from 'vitest'
import {
  clearKey,
  IDEMPOTENCY_KEY_REGEX,
  IDEMPOTENCY_STORAGE_KEY,
  isValidIdempotencyKey,
  readOrCreateKey,
  type IdempotencyStorageReadWrite,
} from '../app/utils/idempotency'

function createMockStorage(initial: Record<string, string> = {}): IdempotencyStorageReadWrite & {
  removeItem: (k: string) => void
  store: Map<string, string>
} {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    store,
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k)
    }),
  }
}

describe('idempotency utils - isValidIdempotencyKey', () => {
  it('validates keys matching /^[A-Za-z0-9_-]{16,64}$/', () => {
    // Valid standard UUIDs
    expect(isValidIdempotencyKey('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true)
    // Valid 16-char minimal key
    expect(isValidIdempotencyKey('1234567890123456')).toBe(true)
    // Valid 64-char maximal key
    expect(isValidIdempotencyKey('A'.repeat(64))).toBe(true)

    // Invalid: too short (<16)
    expect(isValidIdempotencyKey('short-key-123')).toBe(false)
    // Invalid: too long (>64)
    expect(isValidIdempotencyKey('A'.repeat(65))).toBe(false)
    // Invalid characters (spaces, special punctuation)
    expect(isValidIdempotencyKey('invalid key with spaces!!')).toBe(false)
    expect(isValidIdempotencyKey('key-with-$pecial-chars!')).toBe(false)
    // Invalid null / undefined / empty
    expect(isValidIdempotencyKey('')).toBe(false)
    expect(isValidIdempotencyKey(null)).toBe(false)
    expect(isValidIdempotencyKey(undefined)).toBe(false)
  })
})

describe('idempotency utils - readOrCreateKey & clearKey lifecycle', () => {
  it('creates and persists a valid key when storage is empty, then reuses it until cleared', () => {
    const storage = createMockStorage()

    // 1. Initial read creates and saves key
    const key1 = readOrCreateKey(storage)
    expect(key1).toMatch(IDEMPOTENCY_KEY_REGEX)
    expect(storage.setItem).toHaveBeenCalledWith(IDEMPOTENCY_STORAGE_KEY, key1)

    // 2. Subsequent read reuses the exact same key without regenerating
    const key2 = readOrCreateKey(storage, () => 'should-not-be-called-123456')
    expect(key2).toBe(key1)

    // 3. Clear key
    clearKey(storage)
    expect(storage.removeItem).toHaveBeenCalledWith(IDEMPOTENCY_STORAGE_KEY)
    expect(storage.store.has(IDEMPOTENCY_STORAGE_KEY)).toBe(false)

    // 4. Next read generates a fresh key
    const key3 = readOrCreateKey(storage, () => 'new-fresh-key-1234567890')
    expect(key3).toBe('new-fresh-key-1234567890')
    expect(key3).not.toBe(key1)
  })

  it('regenerates a fresh key when the stored value is invalid', () => {
    // Too short key stored previously
    const storageTooShort = createMockStorage({ [IDEMPOTENCY_STORAGE_KEY]: 'too-short' })
    const key1 = readOrCreateKey(storageTooShort, () => 'fixed-valid-key-1234567890')
    expect(key1).toBe('fixed-valid-key-1234567890')

    // Stored key with invalid symbols
    const storageInvalidChars = createMockStorage({
      [IDEMPOTENCY_STORAGE_KEY]: 'invalid@key#with%symbols!',
    })
    const key2 = readOrCreateKey(storageInvalidChars, () => 'clean-valid-key-1234567890')
    expect(key2).toBe('clean-valid-key-1234567890')
  })

  it('works safely when storage is null', () => {
    const key = readOrCreateKey(null, () => 'fallback-key-1234567890')
    expect(key).toBe('fallback-key-1234567890')

    // clearKey should not throw on null storage
    expect(() => clearKey(null)).not.toThrow()
  })

  it('works safely when storage operations throw (e.g. storage disabled or quota exceeded)', () => {
    const brokenStorage: IdempotencyStorageReadWrite & { removeItem: () => void } = {
      getItem: () => {
        throw new Error('Storage access denied')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
      removeItem: () => {
        throw new Error('Access denied')
      },
    }

    const key = readOrCreateKey(brokenStorage, () => 'resilient-key-1234567890')
    expect(key).toBe('resilient-key-1234567890')

    expect(() => clearKey(brokenStorage)).not.toThrow()
  })
})
