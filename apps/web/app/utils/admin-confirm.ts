import type { AdminConfirmSummary } from '@serag/shared'
import { getErrorStatus } from './api'

export type ConfirmViewState = 'actionable' | 'confirmed' | 'cancelled' | 'other'

/**
 * Parses an EGP amount text input into integer piastres (1 EGP = 100 piastres).
 *
 * Rules:
 * - Accepts Arabic-Indic (٠-٩) and Persian (۰-۹) digits.
 * - Accepts Arabic comma (،), Arabic decimal separator (٫), and Arabic thousands separator (٬).
 * - Accepts standard comma and period as decimal or thousand separators.
 * - Trims whitespace.
 * - Validates:
 *   - Non-empty
 *   - Strictly positive (> 0)
 *   - Does not exceed remaining piastres (total - paidAmount) if maxPiastres is provided.
 */
export function parseConfirmAmountEgp(
  input: string,
  maxPiastres?: number,
): { success: true; piastres: number } | { success: false; errorKey: string } {
  if (!input || !input.trim()) {
    return { success: false, errorKey: 'admin.confirm.errors.amountRequired' }
  }

  // 1. Normalize Arabic-Indic and Persian digits to ASCII
  let cleaned = input
    .trim()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))

  // 2. Normalize Arabic separators
  cleaned = cleaned
    .replace(/\u066C/g, '') // Arabic thousands separator
    .replace(/\u066B/g, '.') // Arabic decimal separator
    .replace(/\u060C/g, ',') // Arabic comma

  // Remove all whitespace
  cleaned = cleaned.replace(/\s+/g, '')

  // 3. Handle commas and dots
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastDot > lastComma) {
      // e.g. "1,234.56" -> comma is thousand separator
      cleaned = cleaned.replace(/,/g, '')
    } else {
      // e.g. "1.234,56" -> dot is thousand separator, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.')
    }
  } else if (hasComma) {
    // Only comma(s) present
    const commaParts = cleaned.split(',')
    if (commaParts.length > 2) {
      // e.g. "1,000,000" -> all commas are thousand separators
      cleaned = cleaned.replace(/,/g, '')
    } else if (commaParts.length === 2) {
      const frac = commaParts[1] ?? ''
      // If comma is followed by exactly 3 digits, e.g. "1,000" or "35,000", it's a thousand separator
      if (frac.length === 3) {
        cleaned = cleaned.replace(/,/g, '')
      } else {
        // e.g. "10,5" or "10,50" -> decimal separator
        cleaned = cleaned.replace(/,/g, '.')
      }
    }
  }

  // 4. Validate numeric syntax (e.g. "123" or "123.45")
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { success: false, errorKey: 'admin.confirm.errors.invalidAmount' }
  }

  const num = parseFloat(cleaned)
  if (isNaN(num)) {
    return { success: false, errorKey: 'admin.confirm.errors.invalidAmount' }
  }

  const piastres = Math.round(num * 100)

  if (piastres <= 0) {
    return { success: false, errorKey: 'admin.confirm.errors.amountPositive' }
  }

  if (maxPiastres !== undefined && piastres > maxPiastres) {
    return { success: false, errorKey: 'admin.confirm.errors.amountExceedsRemaining' }
  }

  return { success: true, piastres }
}

/**
 * Computes remaining balance in integer piastres for an order summary.
 */
export function remainingPiastres(summary: AdminConfirmSummary | null | undefined): number {
  if (!summary) return 0
  return Math.max(0, summary.total - summary.paidAmount)
}

/**
 * Maps the summary status and confirmability to the confirm page view state.
 */
export function confirmViewState(
  summary: AdminConfirmSummary | null | undefined,
): ConfirmViewState {
  if (!summary) return 'other'
  if (summary.canConfirm) return 'actionable'
  if (summary.status === 'confirmed') return 'confirmed'
  if (summary.status === 'cancelled') return 'cancelled'
  return 'other'
}

/**
 * Validates a payment rejection reason (3 to 300 characters, matching rejectPaymentInputSchema).
 */
export function validateRejectReason(
  reason: string,
): { success: true; reason: string } | { success: false; errorKey: string } {
  const trimmed = reason.trim()
  if (trimmed.length < 3) {
    return { success: false, errorKey: 'admin.confirm.errors.reasonRequired' }
  }
  if (trimmed.length > 300) {
    return { success: false, errorKey: 'admin.confirm.errors.reasonTooLong' }
  }
  return { success: true, reason: trimmed }
}

/**
 * Maps HTTP statuses or error objects to localized i18n keys for the confirm page.
 */
export function mapConfirmErrorKey(errOrStatus: unknown): string {
  const status = typeof errOrStatus === 'number' ? errOrStatus : getErrorStatus(errOrStatus)
  if (status === 404) {
    return 'admin.confirm.errors.notFound'
  }
  if (status === 409) {
    return 'admin.confirm.errors.conflict'
  }
  if (status === 400) {
    return 'admin.confirm.errors.badRequest'
  }
  if (status === 401) {
    return 'admin.confirm.errors.unauthorized'
  }
  if (status === 403) {
    return 'admin.confirm.errors.forbidden'
  }
  return 'admin.confirm.errors.generic'
}
