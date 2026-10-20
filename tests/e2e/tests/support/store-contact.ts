import { apiUrl } from '../api-url.js'
import type { SeedHelper } from './seed.js'

/** Clearly fake but valid Egyptian mobile used when the store numbers are still placeholders. */
export const TEST_STORE_NUMBER = '01000000000'

interface StoreSection {
  value: Record<string, unknown> & { phone?: unknown; whatsapp?: unknown }
  version: string | null
}

function isPlaceholder(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '' || value.includes('[')
}

/**
 * The storefront hides phone and WhatsApp links while the store numbers are placeholders
 * (as a fresh seed leaves them). Specs that need those links call this first: it fills in
 * TEST_STORE_NUMBER only where a placeholder is left, so it is safe to call from parallel
 * workers and never overwrites numbers someone has saved.
 */
export async function ensureStoreContact(seed: SeedHelper): Promise<void> {
  const session = await seed.adminSession()
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `${session.cookieName}=${session.cookieValue}`,
    'x-csrf-token': session.csrfToken,
  }
  const res = await fetch(apiUrl('/api/admin/settings'), { headers })
  if (!res.ok) throw new Error(`reading settings failed (${res.status})`)
  const { sections } = (await res.json()) as { sections: { store: StoreSection } }
  const store = sections.store
  if (!isPlaceholder(store.value.phone) && !isPlaceholder(store.value.whatsapp)) return

  const value = {
    ...store.value,
    phone: isPlaceholder(store.value.phone) ? TEST_STORE_NUMBER : store.value.phone,
    whatsapp: isPlaceholder(store.value.whatsapp) ? TEST_STORE_NUMBER : store.value.whatsapp,
  }
  const save = await fetch(apiUrl('/api/admin/settings/store'), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value, version: store.version }),
  })
  // 409: another worker filled the numbers first, which is what we wanted
  if (!save.ok && save.status !== 409) throw new Error(`saving store numbers failed (${save.status}): ${await save.text()}`)
}
