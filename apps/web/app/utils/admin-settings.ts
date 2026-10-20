import { SETTINGS_SECTIONS, type SettingsSection } from '@serag/shared'

/** Minimal structural shape of a Zod issue, so the helper stays framework-free and testable. */
export interface SettingsFieldIssue {
  readonly path: PropertyKey[]
  readonly message: string
}

export interface SettingsConflictLatest {
  value: unknown
  version: string | null
}

/** True when the draft differs from the last saved value (JSON deep compare). */
export function settingsDraftDirty(saved: unknown, draft: unknown): boolean {
  if (saved === null || draft === null) {
    return saved !== draft
  }
  return JSON.stringify(saved) !== JSON.stringify(draft)
}

/**
 * Maps Zod issues to a flat `path -> first message` dictionary for form fields.
 * Paths are dot-joined (`0.places.1.governorate`); only the first message per path is kept.
 */
export function zodIssuesToFieldErrors(
  issues: readonly SettingsFieldIssue[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.join('.')
    if (errors[key] === undefined) {
      errors[key] = issue.message
    }
  }
  return errors
}

/** Narrow an unknown string to a known settings section (e.g. from `?tab=`). */
export function isSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section === value)
}

/** Splits a synonym chip input on Latin/Arabic commas and newlines, trimming and dropping empties. */
const SYNONYM_SPLIT_RE = /[,،;؛\n]+/

export function parseSynonymInput(text: string): string[] {
  return text
    .split(SYNONYM_SPLIT_RE)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
}

/** Inserts a `{{variable}}` token at the cursor and returns the text plus the new cursor position. */
export function insertTemplateVariable(
  text: string,
  variable: string,
  cursor: number,
): { text: string; cursor: number } {
  const token = `{{${variable}}}`
  const at = Math.min(Math.max(cursor, 0), text.length)
  return {
    text: text.slice(0, at) + token + text.slice(at),
    cursor: at + token.length,
  }
}

/** Generates a unique id for a newly added delivery zone. */
export function createZoneId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `zone-${crypto.randomUUID()}`
  }
  return `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Extracts the `latest` payload from a 409 settings conflict error, or returns
 * null when the error is not a settings conflict.
 */
export function extractSettingsConflict(err: unknown): SettingsConflictLatest | null {
  if (!err || typeof err !== 'object') {
    return null
  }
  const candidate = err as { data?: unknown; response?: { _data?: unknown } }
  const payload = candidate.data ?? candidate.response?._data
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const latest = (payload as { latest?: unknown }).latest
  if (!latest || typeof latest !== 'object') {
    return null
  }
  const { value, version } = latest as { value?: unknown; version?: unknown }
  if (value === undefined) {
    return null
  }
  if (version !== undefined && version !== null && typeof version !== 'string') {
    return null
  }
  return { value, version: typeof version === 'string' ? version : null }
}
