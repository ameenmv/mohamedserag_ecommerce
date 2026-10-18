export const IDEMPOTENCY_STORAGE_KEY = 'serag:checkout:idem'
export const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{16,64}$/

export type IdempotencyStorageReadWrite = Pick<Storage, 'getItem' | 'setItem'>
export type IdempotencyStorageClear = Pick<Storage, 'removeItem'>

/**
 * Checks whether an idempotency key conforms to the security specification
 * (16 to 64 URL-safe characters: letters, numbers, underscores, and dashes).
 */
export function isValidIdempotencyKey(key: string | null | undefined): boolean {
  if (!key) return false
  return IDEMPOTENCY_KEY_REGEX.test(key)
}

/**
 * Reads an existing valid idempotency key from storage, or creates and stores a new one.
 * If the key in storage is malformed or invalid, generates and persists a fresh key.
 * Works safely when storage is null or throws (e.g. private browsing storage restrictions).
 */
export function readOrCreateKey(
  storage: IdempotencyStorageReadWrite | null,
  create: () => string = () => crypto.randomUUID(),
): string {
  if (storage) {
    try {
      const stored = storage.getItem(IDEMPOTENCY_STORAGE_KEY)
      if (stored && IDEMPOTENCY_KEY_REGEX.test(stored)) {
        return stored
      }
      const fresh = create()
      storage.setItem(IDEMPOTENCY_STORAGE_KEY, fresh)
      return fresh
    } catch {
      // Storage access blocked or quota exceeded
    }
  }
  return create()
}

/**
 * Clears the stored idempotency key upon successful order creation.
 * Works safely when storage is null or throws.
 */
export function clearKey(storage: IdempotencyStorageClear | null): void {
  if (storage) {
    try {
      storage.removeItem(IDEMPOTENCY_STORAGE_KEY)
    } catch {
      // Silently ignore storage issues
    }
  }
}
