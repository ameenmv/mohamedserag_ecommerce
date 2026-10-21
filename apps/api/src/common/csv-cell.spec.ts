import { describe, expect, it } from 'vitest'
import { escapeCsvCell } from './csv-cell.js'

describe('escapeCsvCell', () => {
  it('neutralizes text that would run as a spreadsheet formula', () => {
    expect(escapeCsvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`)
    expect(escapeCsvCell('+201000')).toBe("'+201000")
    expect(escapeCsvCell('-5')).toBe("'-5")
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('leaves numbers and plain Arabic text alone', () => {
    expect(escapeCsvCell(-5)).toBe('-5')
    expect(escapeCsvCell(28900)).toBe('28900')
    expect(escapeCsvCell('أحمد سمير')).toBe('أحمد سمير')
  })

  it('quotes commas, semicolons, quotes and new lines', () => {
    expect(escapeCsvCell('شارع 9، عمارة 5, الدور 2')).toBe('"شارع 9، عمارة 5, الدور 2"')
    expect(escapeCsvCell('a"b')).toBe('"a""b"')
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(escapeCsvCell(null)).toBe('')
  })
})
