import { describe, expect, it } from 'vitest'
import {
  adminProductQuerySchema,
  adminSpecTemplateFieldSchema,
  createBrandSchema,
  createCategorySchema,
  createProductSchema,
  createSpecTemplateSchema,
  reorderCategoriesSchema,
  reorderProductImagesSchema,
  updateProductSchema,
  validateProductSpecs,
} from './admin-catalog-schema.js'

describe('Admin Catalog Schemas', () => {
  describe('adminSpecTemplateFieldSchema', () => {
    it('validates a correct text field', () => {
      const res = adminSpecTemplateFieldSchema.safeParse({
        key: 'model_origin',
        label: 'بلد المنشأ',
        type: 'text',
        filterable: true,
        comparable: true,
      })
      expect(res.success).toBe(true)
    })

    it('validates a choice field with options', () => {
      const res = adminSpecTemplateFieldSchema.safeParse({
        key: 'cooling',
        label: 'نظام التبريد',
        type: 'choice',
        options: ['نوفروست', 'ديفروست'],
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.filterable).toBe(false)
        expect(res.data.comparable).toBe(false)
      }
    })

    it('rejects a choice field without options or with empty options', () => {
      const missing = adminSpecTemplateFieldSchema.safeParse({
        key: 'cooling',
        label: 'نظام التبريد',
        type: 'choice',
      })
      expect(missing.success).toBe(false)

      const empty = adminSpecTemplateFieldSchema.safeParse({
        key: 'cooling',
        label: 'نظام التبريد',
        type: 'choice',
        options: [],
      })
      expect(empty.success).toBe(false)
    })

    it('rejects an invalid key pattern', () => {
      const startWithNumber = adminSpecTemplateFieldSchema.safeParse({
        key: '1cooling',
        label: 'تست',
        type: 'text',
      })
      expect(startWithNumber.success).toBe(false)

      const uppercase = adminSpecTemplateFieldSchema.safeParse({
        key: 'Cooling',
        label: 'تست',
        type: 'text',
      })
      expect(uppercase.success).toBe(false)

      const hyphen = adminSpecTemplateFieldSchema.safeParse({
        key: 'cool-ing',
        label: 'تست',
        type: 'text',
      })
      expect(hyphen.success).toBe(false)
    })
  })

  describe('createSpecTemplateSchema', () => {
    it('accepts template with unique keys', () => {
      const res = createSpecTemplateSchema.safeParse({
        name: 'ثلاجات',
        fields: [
          { key: 'capacity_l', label: 'السعة باللتر', type: 'number', unit: 'لتر' },
          { key: 'cooling', label: 'نظام التبريد', type: 'choice', options: ['نوفروست', 'ديفروست'] },
        ],
      })
      expect(res.success).toBe(true)
    })

    it('rejects template with duplicate keys', () => {
      const res = createSpecTemplateSchema.safeParse({
        name: 'ثلاجات',
        fields: [
          { key: 'capacity_l', label: 'السعة باللتر', type: 'number' },
          { key: 'capacity_l', label: 'السعة مكررة', type: 'number' },
        ],
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('مكرر داخل القالب')
      }
    })
  })

  describe('validateProductSpecs', () => {
    const templateFields = [
      { key: 'capacity_l', type: 'number' as const },
      { key: 'cooling', type: 'choice' as const, options: ['نوفروست', 'ديفروست'] },
      { key: 'inverter', type: 'boolean' as const },
      { key: 'notes', type: 'text' as const },
    ]

    it('returns valid when all specs match definition', () => {
      const specs = {
        capacity_l: 450,
        cooling: 'نوفروست',
        inverter: true,
        notes: 'ملاحظة',
      }
      const res = validateProductSpecs(specs, templateFields)
      expect(res.valid).toBe(true)
      expect(res.errors).toEqual({})
    })

    it('rejects unknown spec keys', () => {
      const specs = {
        unknown_key: 'value',
      }
      const res = validateProductSpecs(specs, templateFields)
      expect(res.valid).toBe(false)
      expect(res.errors.unknown_key).toBeDefined()
    })

    it('rejects wrong type for number, boolean, text and choice', () => {
      const res1 = validateProductSpecs({ capacity_l: 'not-a-number' }, templateFields)
      expect(res1.valid).toBe(false)
      expect(res1.errors.capacity_l).toBeDefined()

      const res2 = validateProductSpecs({ inverter: 'yes' }, templateFields)
      expect(res2.valid).toBe(false)
      expect(res2.errors.inverter).toBeDefined()

      const res3 = validateProductSpecs({ notes: 123 }, templateFields)
      expect(res3.valid).toBe(false)
      expect(res3.errors.notes).toBeDefined()

      const res4 = validateProductSpecs({ cooling: 'خيار-خاطئ' }, templateFields)
      expect(res4.valid).toBe(false)
      expect(res4.errors.cooling).toBeDefined()
    })

    it('ignores null or undefined spec values', () => {
      const specs = {
        capacity_l: null,
        cooling: undefined,
      }
      const res = validateProductSpecs(specs, templateFields)
      expect(res.valid).toBe(true)
    })
  })

  describe('createProductSchema & updateProductSchema', () => {
    it('accepts valid product with integer piastres and oldPrice > price', () => {
      const res = createProductSchema.safeParse({
        name: 'ثلاجة سامسونج 450 لتر',
        modelCode: 'RT45K6000S8',
        brandId: 'brand_1',
        categoryId: 'cat_1',
        price: 2890000,
        oldPrice: 3250000,
        stock: 5,
        lowStockThreshold: 2,
        visible: true,
      })
      expect(res.success).toBe(true)
    })

    it('rejects oldPrice when it is less than or equal to price', () => {
      const equalRes = createProductSchema.safeParse({
        name: 'ثلاجة سامسونج',
        modelCode: 'RT45K6000S8',
        brandId: 'brand_1',
        categoryId: 'cat_1',
        price: 2890000,
        oldPrice: 2890000,
      })
      expect(equalRes.success).toBe(false)

      const lessRes = createProductSchema.safeParse({
        name: 'ثلاجة سامسونج',
        modelCode: 'RT45K6000S8',
        brandId: 'brand_1',
        categoryId: 'cat_1',
        price: 2890000,
        oldPrice: 2000000,
      })
      expect(lessRes.success).toBe(false)
    })

    it('allows null oldPrice (no discount)', () => {
      const res = createProductSchema.safeParse({
        name: 'ثلاجة سامسونج',
        modelCode: 'RT45K6000S8',
        brandId: 'brand_1',
        categoryId: 'cat_1',
        price: 2890000,
        oldPrice: null,
      })
      expect(res.success).toBe(true)
    })

    it('validates cookware set contents', () => {
      const res = createProductSchema.safeParse({
        name: 'طقم حلل جرانيت',
        modelCode: 'TAC-GRN-10',
        brandId: 'brand_tac',
        categoryId: 'cat_cookware',
        price: 890000,
        setContents: [
          { item: 'حلة بالغطاء', size: '20 سم', qty: 1 },
          { item: 'مقلاة', size: '24 سم' },
        ],
      })
      expect(res.success).toBe(true)
    })

    it('updateProductSchema validates oldPrice against price when both are given', () => {
      const invalid = updateProductSchema.safeParse({
        price: 100000,
        oldPrice: 90000,
      })
      expect(invalid.success).toBe(false)

      const valid = updateProductSchema.safeParse({
        price: 100000,
        oldPrice: 120000,
      })
      expect(valid.success).toBe(true)
    })
  })

  describe('adminProductQuerySchema', () => {
    it('applies defaults correctly', () => {
      const res = adminProductQuerySchema.parse({})
      expect(res.page).toBe(1)
      expect(res.pageSize).toBe(20)
      expect(res.sort).toBe('updated')
      expect(res.status).toBeUndefined()
    })

    it('validates allowed status and sort values', () => {
      const res = adminProductQuerySchema.parse({
        status: 'archived',
        sort: 'price',
        stock: 'low',
        page: '2',
        pageSize: '50',
      })
      expect(res.status).toBe('archived')
      expect(res.sort).toBe('price')
      expect(res.stock).toBe('low')
      expect(res.page).toBe(2)
      expect(res.pageSize).toBe(50)
    })
  })

  describe('reorder schemas', () => {
    it('validates category and image reorder inputs', () => {
      expect(reorderCategoriesSchema.safeParse({ ids: ['c1', 'c2'] }).success).toBe(true)
      expect(reorderCategoriesSchema.safeParse({ ids: [] }).success).toBe(false)

      expect(reorderProductImagesSchema.safeParse({ ids: ['img1', 'img2'] }).success).toBe(true)
      expect(reorderProductImagesSchema.safeParse({ ids: [] }).success).toBe(false)
    })
  })

  describe('category & brand schemas', () => {
    it('validates category input', () => {
      const res = createCategorySchema.safeParse({
        name: 'أجهزة تبريد',
        slug: 'fridges',
        sort: 1,
        visible: true,
      })
      expect(res.success).toBe(true)
    })

    it('validates brand input', () => {
      const res = createBrandSchema.safeParse({
        name: 'سامسونج',
        slug: 'samsung',
      })
      expect(res.success).toBe(true)
    })
  })
})
