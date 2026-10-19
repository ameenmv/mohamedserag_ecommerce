import { describe, expect, it } from 'vitest'
import {
  buildImportPlan,
  type ImportProductSource,
  mapImportHeader,
  MAX_IMPORT_ROWS,
  parseCsv,
  parseOldPrice,
  parsePrice,
  parseStock,
  PRODUCT_IMPORT_ERROR_KEYS,
} from './product-import.js'

describe('product-import shared logic', () => {
  describe('parseCsv', () => {
    it('parses standard RFC 4180 CSV with quotes, commas, and CRLF', () => {
      const csv = 'model_code,name,price\r\n"MOD-01","Product, with comma",100\r\n"MOD-02","Product with ""quotes""",200'
      const rows = parseCsv(csv)
      expect(rows).toEqual([
        ['model_code', 'name', 'price'],
        ['MOD-01', 'Product, with comma', '100'],
        ['MOD-02', 'Product with "quotes"', '200'],
      ])
    })

    it('handles newlines inside quoted fields', () => {
      const csv = 'model,name\n"MOD-01","Line 1\nLine 2"\n"MOD-02","Simple"'
      const rows = parseCsv(csv)
      expect(rows).toEqual([
        ['model', 'name'],
        ['MOD-01', 'Line 1\nLine 2'],
        ['MOD-02', 'Simple'],
      ])
    })

    it('strips UTF-8 BOM if present at start', () => {
      const csv = '\uFEFFmodel_code,price\nMOD-01,150'
      const rows = parseCsv(csv)
      expect(rows).toEqual([
        ['model_code', 'price'],
        ['MOD-01', '150'],
      ])
    })

    it('skips fully empty lines at start, middle, and end', () => {
      const csv = '\r\n\r\nmodel_code,price\r\n\r\nMOD-01,150\r\n   \r\nMOD-02,200\r\n\r\n'
      const rows = parseCsv(csv)
      expect(rows).toEqual([
        ['model_code', 'price'],
        ['MOD-01', '150'],
        ['MOD-02', '200'],
      ])
    })

    it('auto-detects semicolon delimiter when header has ; and no comma', () => {
      const csv = 'model_code;price;stock\r\nMOD-01;250;5\r\nMOD-02;300;10'
      const rows = parseCsv(csv)
      expect(rows).toEqual([
        ['model_code', 'price', 'stock'],
        ['MOD-01', '250', '5'],
        ['MOD-02', '300', '10'],
      ])
    })

    it('returns empty array for empty string', () => {
      expect(parseCsv('')).toEqual([])
    })
  })

  describe('mapImportHeader', () => {
    it('maps English column aliases case-insensitively and trimmed', () => {
      const header = ['  MODEL_CODE  ', 'Name', 'Price', 'OLD_PRICE', ' Qty ']
      const res = mapImportHeader(header)
      expect(res.headerError).toBeUndefined()
      expect(res.mapping).toEqual({
        modelCode: 0,
        name: 1,
        price: 2,
        oldPrice: 3,
        stock: 4,
      })
    })

    it('maps Arabic column aliases', () => {
      const header = ['كود الموديل', 'اسم المنتج', 'سعر البيع', 'السعر القديم', 'الكمية']
      const res = mapImportHeader(header)
      expect(res.headerError).toBeUndefined()
      expect(res.mapping).toEqual({
        modelCode: 0,
        name: 1,
        price: 2,
        oldPrice: 3,
        stock: 4,
      })
    })

    it('maps alternative aliases like sku, compare_at, stock', () => {
      const header = ['sku', 'compare_at', 'stock']
      const res = mapImportHeader(header)
      expect(res.headerError).toBeUndefined()
      expect(res.mapping?.modelCode).toBe(0)
      expect(res.mapping?.oldPrice).toBe(1)
      expect(res.mapping?.stock).toBe(2)
      expect(res.mapping?.price).toBe(-1)
    })

    it('returns error when model_code column is missing', () => {
      const header = ['name', 'price', 'stock']
      const res = mapImportHeader(header)
      expect(res.headerError).toBe(PRODUCT_IMPORT_ERROR_KEYS.missingModelCodeHeader)
      expect(res.mapping).toBeUndefined()
    })

    it('returns error when no updatable column (price, oldPrice, stock) is present', () => {
      const header = ['model_code', 'name']
      const res = mapImportHeader(header)
      expect(res.headerError).toBe(PRODUCT_IMPORT_ERROR_KEYS.noUpdatableColumns)
      expect(res.mapping).toBeUndefined()
    })

    it('returns error on empty header array', () => {
      const res = mapImportHeader([])
      expect(res.headerError).toBe(PRODUCT_IMPORT_ERROR_KEYS.headerMissing)
    })
  })

  describe('value parsers', () => {
    describe('parsePrice', () => {
      it('parses valid numeric prices in EGP and converts to piastres', () => {
        expect(parsePrice('250')).toEqual({ hasValue: true, value: 25000 })
        expect(parsePrice('250.5')).toEqual({ hasValue: true, value: 25050 })
        expect(parsePrice('250.75')).toEqual({ hasValue: true, value: 25075 })
      })

      it('parses prices with thousands separators and spaces', () => {
        expect(parsePrice('28,900')).toEqual({ hasValue: true, value: 2890000 })
        expect(parsePrice('28 900.50')).toEqual({ hasValue: true, value: 2890050 })
        expect(parsePrice('28٬900٫50')).toEqual({ hasValue: true, value: 2890050 })
      })

      it('parses Arabic-Indic digits', () => {
        expect(parsePrice('٢٨٩٠٠')).toEqual({ hasValue: true, value: 2890000 })
        expect(parsePrice('١٥٠٫٧٥')).toEqual({ hasValue: true, value: 15075 })
      })

      it('returns hasValue: false on empty or whitespace strings', () => {
        expect(parsePrice('')).toEqual({ hasValue: false })
        expect(parsePrice('   ')).toEqual({ hasValue: false })
        expect(parsePrice(undefined)).toEqual({ hasValue: false })
      })

      it('rejects invalid prices (negative, zero, letters, >2 decimals)', () => {
        expect(parsePrice('0').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidPrice)
        expect(parsePrice('-100').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidPrice)
        expect(parsePrice('abc').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidPrice)
        expect(parsePrice('100.123').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidPrice)
      })
    })

    describe('parseOldPrice', () => {
      it('parses valid oldPrice in EGP into piastres', () => {
        expect(parseOldPrice('350')).toEqual({ hasValue: true, value: 35000 })
        expect(parseOldPrice('1,250.50')).toEqual({ hasValue: true, value: 125050 })
      })

      it('clears oldPrice (returns null) on 0, ٠, or -', () => {
        expect(parseOldPrice('0')).toEqual({ hasValue: true, value: null })
        expect(parseOldPrice('٠')).toEqual({ hasValue: true, value: null })
        expect(parseOldPrice('-')).toEqual({ hasValue: true, value: null })
      })

      it('returns hasValue: false on empty cell', () => {
        expect(parseOldPrice('')).toEqual({ hasValue: false })
        expect(parseOldPrice('  ')).toEqual({ hasValue: false })
      })

      it('rejects invalid numbers', () => {
        expect(parseOldPrice('abc').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidOldPrice)
        expect(parseOldPrice('-50').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidOldPrice)
      })
    })

    describe('parseStock', () => {
      it('parses valid integer stock', () => {
        expect(parseStock('10')).toEqual({ hasValue: true, value: 10 })
        expect(parseStock('0')).toEqual({ hasValue: true, value: 0 })
        expect(parseStock('1,000')).toEqual({ hasValue: true, value: 1000 })
        expect(parseStock('١٥')).toEqual({ hasValue: true, value: 15 })
      })

      it('returns hasValue: false on empty cell', () => {
        expect(parseStock('')).toEqual({ hasValue: false })
        expect(parseStock('  ')).toEqual({ hasValue: false })
      })

      it('rejects non-integers, negative numbers, and letters', () => {
        expect(parseStock('10.5').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidStock)
        expect(parseStock('-5').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidStock)
        expect(parseStock('none').error).toBe(PRODUCT_IMPORT_ERROR_KEYS.invalidStock)
      })
    })
  })

  describe('buildImportPlan', () => {
    const mockProducts: ImportProductSource[] = [
      {
        id: 'prod-1',
        modelCode: 'MOD-REF-01',
        name: 'ثلاجة 16 قدم',
        price: 2500000, // 25,000 EGP
        oldPrice: 2800000, // 28,000 EGP
        stock: 5,
        archived: false,
      },
      {
        id: 'prod-2',
        modelCode: 'MOD-WASH-02',
        name: 'غسالة 9 كيلو',
        price: 1800000, // 18,000 EGP
        oldPrice: null,
        stock: 12,
        archived: true,
      },
    ]

    it('creates plan with update, unchanged, not_found, duplicate, and error rows', () => {
      const rows = [
        ['model_code', 'price', 'old_price', 'stock'],
        // Row 1: Valid update (changes price and stock)
        ['MOD-REF-01', '26000', '', '8'],
        // Row 2: Unchanged (same values)
        ['MOD-REF-01', '26000', '', '8'], // duplicate!
        // Row 3: Product not found
        ['MOD-UNKNOWN', '5000', '', '10'],
        // Row 4: Validation error (invalid price)
        ['MOD-REF-01-FAKE', 'invalid-price', '', '5'],
        // Row 5: OldPrice <= price error on prod-1
        // Row 6: Archived product update with warning flag
        ['MOD-WASH-02', '19000', '22000', '15'],
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.headerError).toBeUndefined()
      expect(plan.rows).toHaveLength(5)

      // Row 1: update on prod-1
      expect(plan.rows[0]?.line).toBe(2)
      expect(plan.rows[0]?.modelCode).toBe('MOD-REF-01')
      expect(plan.rows[0]?.status).toBe('update')
      expect(plan.rows[0]?.changes).toEqual(['price', 'stock'])
      expect(plan.rows[0]?.current?.price).toBe(2500000)
      expect(plan.rows[0]?.next?.price).toBe(2600000)
      expect(plan.rows[0]?.next?.stock).toBe(8)

      // Row 2: duplicate
      expect(plan.rows[1]?.line).toBe(3)
      expect(plan.rows[1]?.status).toBe('duplicate')
      expect(plan.rows[1]?.errors).toContain(PRODUCT_IMPORT_ERROR_KEYS.duplicateModelCode)

      // Row 3: not_found
      expect(plan.rows[2]?.line).toBe(4)
      expect(plan.rows[2]?.status).toBe('not_found')
      expect(plan.rows[2]?.errors).toContain(PRODUCT_IMPORT_ERROR_KEYS.modelNotFound)

      // Row 4: error (unknown product + invalid price)
      expect(plan.rows[3]?.line).toBe(5)
      expect(plan.rows[3]?.status).toBe('not_found') // not found in DB
      expect(plan.rows[3]?.errors).toContain(PRODUCT_IMPORT_ERROR_KEYS.invalidPrice)

      // Row 5: archived product updated
      expect(plan.rows[4]?.line).toBe(6)
      expect(plan.rows[4]?.modelCode).toBe('MOD-WASH-02')
      expect(plan.rows[4]?.status).toBe('update')
      expect(plan.rows[4]?.archived).toBe(true)
      expect(plan.rows[4]?.changes).toEqual(['price', 'oldPrice', 'stock'])
    })

    it('detects oldPrice not greater than price as an error', () => {
      const rows = [
        ['model_code', 'price', 'old_price'],
        ['MOD-REF-01', '25000', '24000'], // oldPrice 24000 <= price 25000
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.rows[0]?.status).toBe('error')
      expect(plan.rows[0]?.errors).toContain(PRODUCT_IMPORT_ERROR_KEYS.oldPriceNotGreaterThanPrice)
    })

    it('allows clearing oldPrice with 0 or -', () => {
      const rows = [
        ['model_code', 'old_price'],
        ['MOD-REF-01', '0'],
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.rows[0]?.status).toBe('update')
      expect(plan.rows[0]?.changes).toEqual(['oldPrice'])
      expect(plan.rows[0]?.current?.oldPrice).toBe(2800000)
      expect(plan.rows[0]?.next?.oldPrice).toBeNull()
    })

    it('identifies unchanged row when inputs match existing values exactly', () => {
      const rows = [
        ['model_code', 'price', 'stock'],
        ['MOD-REF-01', '25000', '5'],
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.rows[0]?.status).toBe('unchanged')
      expect(plan.rows[0]?.changes).toEqual([])
      expect(plan.summary.unchanged).toBe(1)
      expect(plan.summary.update).toBe(0)
    })

    it('matches model codes case-insensitively and trimmed', () => {
      const rows = [
        ['model_code', 'stock'],
        ['  mod-ref-01  ', '10'],
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.rows[0]?.productId).toBe('prod-1')
      expect(plan.rows[0]?.status).toBe('update')
    })

    it('rejects imports exceeding MAX_IMPORT_ROWS (2000 rows) with headerError', () => {
      const rows: string[][] = [['model_code', 'price']]
      for (let i = 0; i <= MAX_IMPORT_ROWS; i++) {
        rows.push([`MOD-${i}`, '100'])
      }

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.headerError).toBe(PRODUCT_IMPORT_ERROR_KEYS.maxRowsExceeded)
      expect(plan.rows).toHaveLength(0)
    })

    it('handles Arabic headers and Arabic-Indic digit inputs in the full plan', () => {
      const rows = [
        ['كود الموديل', 'سعر البيع', 'المخزون'],
        ['MOD-REF-01', '٢٦٠٠٠', '١٠'],
      ]

      const plan = buildImportPlan(rows, mockProducts)
      expect(plan.headerError).toBeUndefined()
      expect(plan.rows[0]?.status).toBe('update')
      expect(plan.rows[0]?.next?.price).toBe(2600000)
      expect(plan.rows[0]?.next?.stock).toBe(10)
    })
  })
})
