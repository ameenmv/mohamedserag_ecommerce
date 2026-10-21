import type { SpecFieldType } from '@serag/shared'

export type SpecFieldLike = SpecFieldType | { type: SpecFieldType }

export function getSpecFieldType(field: SpecFieldLike): SpecFieldType {
  return typeof field === 'string' ? field : field.type
}

/** Spec value as the text/choice input shows it. */
export function specText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Spec value as the number input shows it. */
export function specNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

/** Spec value as the checkbox shows it. */
export function specBool(value: unknown): boolean {
  return value === true
}

/**
 * Parses user input from form controls into the typed value expected in the product specs payload.
 */
export function parseSpecInput(
  field: SpecFieldLike,
  raw: unknown,
): string | number | boolean | undefined {
  const type = getSpecFieldType(field)
  switch (type) {
    case 'text': {
      if (raw === null || raw === undefined) return undefined
      const s = String(raw).trim()
      return s.length > 0 ? s : undefined
    }
    case 'number': {
      if (raw === null || raw === undefined || String(raw).trim() === '') return undefined
      const n = Number(raw)
      return !Number.isNaN(n) && n >= 0 ? n : undefined
    }
    case 'boolean':
      return Boolean(raw)
    case 'choice': {
      if (raw === null || raw === undefined) return undefined
      const s = String(raw).trim()
      return s.length > 0 ? s : undefined
    }
    default:
      return undefined
  }
}
