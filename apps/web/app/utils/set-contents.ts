export interface SetContentPiece {
  item: string
  size?: string
  qty: number
}

/**
 * Defensively parses an untyped setContents array (from JSON column or API).
 * Drops null, undefined, primitive, or invalid entries missing a non-empty `item`.
 * Normalizes optional size and positive integer qty (defaults to 1).
 */
export function parseSetContents(input: unknown): SetContentPiece[] {
  if (!Array.isArray(input)) {
    return []
  }

  const result: SetContentPiece[] = []

  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue
    }

    const obj = entry as Record<string, unknown>
    if (typeof obj.item !== 'string' || obj.item.trim().length === 0) {
      continue
    }

    const piece: SetContentPiece = {
      item: obj.item.trim(),
      qty: 1,
    }

    if (typeof obj.size === 'string' && obj.size.trim().length > 0) {
      piece.size = obj.size.trim()
    } else if (typeof obj.size === 'number' && Number.isFinite(obj.size)) {
      piece.size = String(obj.size)
    }

    if (typeof obj.qty === 'number' && Number.isFinite(obj.qty) && obj.qty > 0) {
      piece.qty = Math.floor(obj.qty)
    } else if (typeof obj.qty === 'string') {
      const parsed = parseInt(obj.qty, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        piece.qty = parsed
      }
    }

    result.push(piece)
  }

  return result
}
