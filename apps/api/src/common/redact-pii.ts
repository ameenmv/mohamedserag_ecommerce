const MAX_LENGTH = 300

/**
 * Masks digit runs of 7+ (phones) and sensitive tokens/secrets,
 * then truncates the result to at most 300 characters.
 */
export function redactPii(text: string): string {
  if (typeof text !== 'string') return ''

  let result = text
    .replace(/(Bearer\s+)["']?[^\s,;'"]+["']?/gi, '$1[REDACTED]')
    .replace(/(token=)["']?[^\s,;'"]+["']?/gi, '$1[REDACTED]')
    .replace(/(secret\s*[:=]?\s*)["']?[^\s,;'"]+["']?/gi, '$1[REDACTED]')
    .replace(/\d{7,}/g, '[REDACTED]')

  if (result.length > MAX_LENGTH) {
    result = result.slice(0, MAX_LENGTH)
  }

  return result
}
