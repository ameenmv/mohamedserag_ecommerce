export const PHONE_ERROR_MESSAGE = 'رقم الموبايل مش صحيح'

const EGYPT_MOBILE_RE = /^01[0125]\d{8}$/

/**
 * Normalizes an Egyptian mobile phone number to the 11-digit format `01[0125]XXXXXXXX`,
 * or returns `null` if invalid.
 *
 * Accepts Arabic-Indic and Persian digits, spaces, dashes, `+20`, `0020`, `20` prefixes,
 * and a missing leading `0` (e.g. `1012345678`).
 */
export function normalizePhone(input: string): string | null {
  const digitsconverted = input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-().]+/g, '')

  if (!/^\+?\d+$/.test(digitsconverted)) {
    return null
  }

  let candidate = digitsconverted

  if (candidate.startsWith('+20')) {
    candidate = candidate.slice(3)
  } else if (candidate.startsWith('0020')) {
    candidate = candidate.slice(4)
  } else if (candidate.startsWith('20') && (candidate.length === 12 || candidate.length === 13)) {
    candidate = candidate.slice(2)
  }

  if (candidate.length === 10 && candidate.startsWith('1')) {
    candidate = `0${candidate}`
  }

  return EGYPT_MOBILE_RE.test(candidate) ? candidate : null
}
