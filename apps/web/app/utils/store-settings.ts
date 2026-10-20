import { normalizePhone } from '@serag/shared'

/**
 * Maps a saved store WhatsApp number to the international digit format
 * `wa.me` links expect (`201…` for Egyptian numbers). Returns an empty
 * string for missing values and untouched `[placeholder]` values, so
 * callers can hide the WhatsApp link entirely.
 */
export function storeWhatsappDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  if (trimmed === '' || trimmed.includes('[')) return ''
  const normalized = normalizePhone(trimmed)
  if (normalized !== null) return `2${normalized}`
  const digits = trimmed.replace(/\D+/g, '').replace(/^00/, '')
  return digits.startsWith('0') ? `2${digits}` : digits
}

/**
 * Maps a saved store phone number to a displayable local number
 * (`01…`), or an empty string for missing values and untouched
 * `[placeholder]` values.
 */
export function storePhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  if (trimmed === '' || trimmed.includes('[')) return ''
  return normalizePhone(trimmed) ?? trimmed
}
