/** Leading characters that spreadsheet apps treat as the start of a formula. */
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * Escapes one CSV cell for exports opened in Excel/Sheets.
 * Text that starts like a formula (`=HYPERLINK(...)`, `+1`, `@cmd`) gets a leading `'` so it is
 * shown as text instead of executed — customer names and addresses come from the public checkout.
 * Numbers are written as-is (negative numbers are not text input).
 */
export function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
  if (typeof val === 'string' && FORMULA_START.test(str)) {
    str = `'${str}`
  }
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
