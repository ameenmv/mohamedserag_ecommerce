import { describe, expect, it } from 'vitest'
import { productImportInputSchema } from './product-import-schema.js'

describe('productImportInputSchema', () => {
  it('validates CSV payload string within size limit', () => {
    const res = productImportInputSchema.safeParse({ csv: 'model,price\nM1,100' })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.csv).toBe('model,price\nM1,100')
    }
  })

  it('rejects missing or non-string csv', () => {
    expect(productImportInputSchema.safeParse({}).success).toBe(false)
    expect(productImportInputSchema.safeParse({ csv: 123 }).success).toBe(false)
  })
})
