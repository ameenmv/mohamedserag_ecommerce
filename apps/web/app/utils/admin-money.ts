import { egpToPiastres, piastresToEgp } from '@serag/shared'

/**
 * Converts a raw user EGP text input or number into integer piastres for API transmission.
 * Returns null if the input is empty or invalid.
 */
export function egpInputToPiastres(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'number') {
    if (Number.isNaN(input) || input < 0) return null
    return egpToPiastres(input)
  }

  const trimmed = input.trim()
  if (trimmed === '') {
    return null
  }

  // Parse numeric string allowing up to 2 decimal places
  const parsed = Number.parseFloat(trimmed)
  if (Number.isNaN(parsed) || parsed < 0) {
    return null
  }

  return egpToPiastres(parsed)
}

/**
 * Converts integer piastres from the API into an editable EGP string for admin form inputs.
 * Returns an empty string for null/undefined/invalid values.
 */
export function piastresToEgpInput(piastres: number | null | undefined): string {
  if (piastres === null || piastres === undefined || Number.isNaN(piastres)) {
    return ''
  }

  const egp = piastresToEgp(piastres)
  // Format cleanly: avoid unnecessary trailing zeroes (e.g. 150 instead of 150.00, 150.5 instead of 150.50)
  return Number(egp.toFixed(2)).toString()
}

/**
 * Computes discount percentage from price and oldPrice in piastres.
 * Returns null if oldPrice is not greater than price.
 */
export function calculateDiscountPercent(
  price: number | null | undefined,
  oldPrice: number | null | undefined,
): number | null {
  if (price === null || price === undefined || oldPrice === null || oldPrice === undefined) {
    return null
  }

  if (oldPrice > price && price >= 0) {
    return Math.round(((oldPrice - price) / oldPrice) * 100)
  }

  return null
}
