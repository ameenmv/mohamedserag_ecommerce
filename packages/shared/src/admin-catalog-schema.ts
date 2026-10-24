import { z } from 'zod'
import { AVAILABILITY_MODES } from './enums.js'

export const SPEC_KEY_REGEX = /^[a-z][a-z0-9_]*$/

export const ADMIN_SPEC_FIELD_TYPES = ['text', 'number', 'boolean', 'choice'] as const
export type AdminSpecFieldType = (typeof ADMIN_SPEC_FIELD_TYPES)[number]

/**
 * Validates a single field in a spec template.
 * - key must start with lowercase letter, contain only a-z, 0-9, and _
 * - type must be text, number, boolean, or choice
 * - options is required and non-empty when type is choice
 */
export const adminSpecTemplateFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(
        SPEC_KEY_REGEX,
        'مفتاح الخاصية يجب أن يبدأ بحرف إنجليزي صغير ويحتوي فقط على حروف صغيرة وأرقام و_',
      ),
    label: z.string().trim().min(1, 'اسم الخاصية مطلوب'),
    type: z.enum(ADMIN_SPEC_FIELD_TYPES),
    unit: z.string().trim().nullable().optional(),
    options: z
      .array(z.string().trim().min(1, 'خيار القائمة لا يمكن أن يكون فارغاً'))
      .nullable()
      .optional(),
    // English for the /en storefront; optionsEn lines up with options (same order and length)
    labelEn: z.string().trim().nullable().optional(),
    unitEn: z.string().trim().nullable().optional(),
    optionsEn: z.array(z.string().trim()).nullable().optional(),
    filterable: z.boolean().default(false),
    comparable: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'choice') {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'خيارات القائمة مطلوبة وغير فارغة للنوع المختار',
          path: ['options'],
        })
      }
    }
    if (data.optionsEn && data.optionsEn.length > 0 && data.optionsEn.length !== (data.options?.length ?? 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'عدد الخيارات بالإنجليزي لازم يساوي عدد الخيارات بالعربي',
        path: ['optionsEn'],
      })
    }
  })

export type AdminSpecTemplateFieldInput = z.input<typeof adminSpecTemplateFieldSchema>
export type AdminSpecTemplateFieldOutput = z.output<typeof adminSpecTemplateFieldSchema>

/**
 * Validates spec template creation input.
 * Enforces that keys inside the template are unique.
 */
export const createSpecTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'اسم القالب مطلوب'),
    fields: z.array(adminSpecTemplateFieldSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    for (const [i, field] of data.fields.entries()) {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `المفتاح "${field.key}" مكرر داخل القالب`,
          path: ['fields', i, 'key'],
        })
      }
      seen.add(field.key)
    }
  })

export type CreateSpecTemplateInput = z.input<typeof createSpecTemplateSchema>
export type CreateSpecTemplateOutput = z.output<typeof createSpecTemplateSchema>

export const updateSpecTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'اسم القالب مطلوب').optional(),
    fields: z.array(adminSpecTemplateFieldSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fields) {
      const seen = new Set<string>()
      for (const [i, field] of data.fields.entries()) {
        if (seen.has(field.key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `المفتاح "${field.key}" مكرر داخل القالب`,
            path: ['fields', i, 'key'],
          })
        }
        seen.add(field.key)
      }
    }
  })

export type UpdateSpecTemplateInput = z.input<typeof updateSpecTemplateSchema>
export type UpdateSpecTemplateOutput = z.output<typeof updateSpecTemplateSchema>

/**
 * English translations schema for categories.
 * Drops empty and whitespace-only strings so Arabic fallback applies.
 */
export const categoryTranslationsEnSchema = z
  .object({
    name: z.string().trim().nullable().optional(),
    intro: z.string().trim().nullable().optional(),
    seoTitle: z.string().trim().nullable().optional(),
    seoDescription: z.string().trim().nullable().optional(),
  })
  .transform((data) => {
    const res: {
      name?: string
      intro?: string
      seoTitle?: string
      seoDescription?: string
    } = {}
    if (data.name && data.name.length > 0) res.name = data.name
    if (data.intro && data.intro.length > 0) res.intro = data.intro
    if (data.seoTitle && data.seoTitle.length > 0) res.seoTitle = data.seoTitle
    if (data.seoDescription && data.seoDescription.length > 0) res.seoDescription = data.seoDescription
    return res
  })

export type CategoryTranslationsEnInput = z.input<typeof categoryTranslationsEnSchema>
export type CategoryTranslationsEn = z.output<typeof categoryTranslationsEnSchema>

export const categoryTranslationsSchema = z.object({
  en: categoryTranslationsEnSchema.optional(),
})

export type CategoryTranslationsInput = z.input<typeof categoryTranslationsSchema>
export type CategoryTranslations = z.output<typeof categoryTranslationsSchema>

/**
 * Category creation and update schemas.
 */
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'اسم القسم مطلوب'),
  slug: z.string().trim().min(1, 'الرابط التعريفي مطلوب'),
  parentId: z.string().trim().nullable().optional(),
  specTemplateId: z.string().trim().nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().default(0),
  visible: z.boolean().default(true),
  translations: categoryTranslationsSchema.nullable().optional(),
})

export type CreateCategoryInput = z.input<typeof createCategorySchema>
export type CreateCategoryOutput = z.output<typeof createCategorySchema>

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'اسم القسم مطلوب').optional(),
  slug: z.string().trim().min(1, 'الرابط التعريفي مطلوب').optional(),
  parentId: z.string().trim().nullable().optional(),
  specTemplateId: z.string().trim().nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().optional(),
  visible: z.boolean().optional(),
  translations: categoryTranslationsSchema.nullable().optional(),
})

export type UpdateCategoryInput = z.input<typeof updateCategorySchema>
export type UpdateCategoryOutput = z.output<typeof updateCategorySchema>

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().trim().min(1, 'معرف غير صالح')).min(1, 'قائمة المعرفات مطلوبة'),
})

export type ReorderCategoriesInput = z.input<typeof reorderCategoriesSchema>

/**
 * English translations schema for brands.
 * Drops empty and whitespace-only strings so Arabic fallback applies.
 */
export const brandTranslationsEnSchema = z
  .object({
    name: z.string().trim().nullable().optional(),
    intro: z.string().trim().nullable().optional(),
    seoTitle: z.string().trim().nullable().optional(),
    seoDescription: z.string().trim().nullable().optional(),
  })
  .transform((data) => {
    const res: {
      name?: string
      intro?: string
      seoTitle?: string
      seoDescription?: string
    } = {}
    if (data.name && data.name.length > 0) res.name = data.name
    if (data.intro && data.intro.length > 0) res.intro = data.intro
    if (data.seoTitle && data.seoTitle.length > 0) res.seoTitle = data.seoTitle
    if (data.seoDescription && data.seoDescription.length > 0) res.seoDescription = data.seoDescription
    return res
  })

export type BrandTranslationsEnInput = z.input<typeof brandTranslationsEnSchema>
export type BrandTranslationsEn = z.output<typeof brandTranslationsEnSchema>

export const brandTranslationsSchema = z.object({
  en: brandTranslationsEnSchema.optional(),
})

export type BrandTranslationsInput = z.input<typeof brandTranslationsSchema>
export type BrandTranslations = z.output<typeof brandTranslationsSchema>

/**
 * Brand creation and update schemas.
 */
export const createBrandSchema = z.object({
  name: z.string().trim().min(1, 'اسم الماركة مطلوب'),
  slug: z.string().trim().min(1, 'الرابط التعريفي مطلوب'),
  logoUrl: z.string().trim().nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().default(0),
  visible: z.boolean().default(true),
  translations: brandTranslationsSchema.nullable().optional(),
})

export type CreateBrandInput = z.input<typeof createBrandSchema>
export type CreateBrandOutput = z.output<typeof createBrandSchema>

export const updateBrandSchema = z.object({
  name: z.string().trim().min(1, 'اسم الماركة مطلوب').optional(),
  slug: z.string().trim().min(1, 'الرابط التعريفي مطلوب').optional(),
  logoUrl: z.string().trim().nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  seoTitle: z.string().trim().nullable().optional(),
  seoDescription: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().optional(),
  visible: z.boolean().optional(),
  translations: brandTranslationsSchema.nullable().optional(),
})

export type UpdateBrandInput = z.input<typeof updateBrandSchema>
export type UpdateBrandOutput = z.output<typeof updateBrandSchema>

/**
 * Cookware set content piece schema.
 */
export const productSetContentPieceSchema = z.object({
  item: z.string().trim().min(1, 'اسم القطعة مطلوب'),
  size: z.string().trim().nullable().optional(),
  qty: z.coerce.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل').nullable().optional(),
})

export type ProductSetContentPieceInput = z.input<typeof productSetContentPieceSchema>
export type ProductSetContentPieceOutput = z.output<typeof productSetContentPieceSchema>

/**
 * English translations schema for products.
 * Drops empty and whitespace-only strings so Arabic fallback applies.
 * Set contents rows reuse the productSetContentPieceSchema.
 */
export const productTranslationsEnSchema = z
  .object({
    name: z.string().trim().nullable().optional(),
    leadTimeText: z.string().trim().nullable().optional(),
    warranty: z.string().trim().nullable().optional(),
    warrantyActivation: z.string().trim().nullable().optional(),
    origin: z.string().trim().nullable().optional(),
    seoTitle: z.string().trim().nullable().optional(),
    seoDescription: z.string().trim().nullable().optional(),
    setContents: z.array(productSetContentPieceSchema).nullable().optional(),
  })
  .transform((data) => {
    const res: {
      name?: string
      leadTimeText?: string
      warranty?: string
      warrantyActivation?: string
      origin?: string
      seoTitle?: string
      seoDescription?: string
      setContents?: z.output<typeof productSetContentPieceSchema>[]
    } = {}
    if (data.name && data.name.length > 0) res.name = data.name
    if (data.leadTimeText && data.leadTimeText.length > 0) res.leadTimeText = data.leadTimeText
    if (data.warranty && data.warranty.length > 0) res.warranty = data.warranty
    if (data.warrantyActivation && data.warrantyActivation.length > 0)
      res.warrantyActivation = data.warrantyActivation
    if (data.origin && data.origin.length > 0) res.origin = data.origin
    if (data.seoTitle && data.seoTitle.length > 0) res.seoTitle = data.seoTitle
    if (data.seoDescription && data.seoDescription.length > 0) res.seoDescription = data.seoDescription
    if (data.setContents && data.setContents.length > 0) res.setContents = data.setContents
    return res
  })

export type ProductTranslationsEnInput = z.input<typeof productTranslationsEnSchema>
export type ProductTranslationsEn = z.output<typeof productTranslationsEnSchema>

export const productTranslationsSchema = z.object({
  en: productTranslationsEnSchema.optional(),
})

export type ProductTranslationsInput = z.input<typeof productTranslationsSchema>
export type ProductTranslations = z.output<typeof productTranslationsSchema>

/**
 * Product creation schema.
 * All prices must be integer piastres.
 * If oldPrice is present, it must be greater than price.
 */
export const createProductSchema = z
  .object({
    name: z.string().trim().min(1, 'اسم المنتج مطلوب'),
    slug: z.string().trim().optional(),
    modelCode: z.string().trim().min(1, 'كود الموديل مطلوب'),
    brandId: z.string().trim().min(1, 'الماركة مطلوبة'),
    categoryId: z.string().trim().min(1, 'القسم مطلوب'),
    specs: z.record(z.string(), z.unknown()).default({}),
    price: z.coerce.number().int().min(0, 'السعر لا يمكن أن يكون سالباً'),
    oldPrice: z.coerce.number().int().min(0, 'السعر القديم لا يمكن أن يكون سالباً').nullable().optional(),
    stock: z.coerce.number().int().min(0, 'المخزون لا يمكن أن يكون سالباً').default(0),
    lowStockThreshold: z.coerce
      .number()
      .int()
      .min(0, 'حد المخزون المنخفض لا يمكن أن يكون سالباً')
      .optional(),
    availabilityMode: z.enum(AVAILABILITY_MODES).default('auto'),
    leadTimeText: z.string().trim().nullable().optional(),
    warranty: z.string().trim().nullable().optional(),
    warrantyActivation: z.string().trim().nullable().optional(),
    origin: z.string().trim().nullable().optional(),
    setContents: z.array(productSetContentPieceSchema).nullable().optional(),
    visible: z.boolean().default(false),
    featured: z.boolean().default(false),
    seoTitle: z.string().trim().nullable().optional(),
    seoDescription: z.string().trim().nullable().optional(),
    taxRate: z.coerce.number().int().min(0, 'نسبة الضريبة لا يمكن أن تكون سالبة').default(14),
    translations: productTranslationsSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.oldPrice !== null && data.oldPrice !== undefined) {
      if (data.oldPrice <= data.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'السعر القديم يجب أن يكون أكبر من السعر الحالي',
          path: ['oldPrice'],
        })
      }
    }
  })

export type CreateProductInput = z.input<typeof createProductSchema>
export type CreateProductOutput = z.output<typeof createProductSchema>

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, 'اسم المنتج مطلوب').optional(),
    slug: z.string().trim().min(1, 'الرابط التعريفي مطلوب').optional(),
    modelCode: z.string().trim().min(1, 'كود الموديل مطلوب').optional(),
    brandId: z.string().trim().min(1, 'الماركة مطلوبة').optional(),
    categoryId: z.string().trim().min(1, 'القسم مطلوب').optional(),
    specs: z.record(z.string(), z.unknown()).optional(),
    price: z.coerce.number().int().min(0, 'السعر لا يمكن أن يكون سالباً').optional(),
    oldPrice: z.coerce.number().int().min(0, 'السعر القديم لا يمكن أن يكون سالباً').nullable().optional(),
    stock: z.coerce.number().int().min(0, 'المخزون لا يمكن أن يكون سالباً').optional(),
    lowStockThreshold: z.coerce
      .number()
      .int()
      .min(0, 'حد المخزون المنخفض لا يمكن أن يكون سالباً')
      .optional(),
    availabilityMode: z.enum(AVAILABILITY_MODES).optional(),
    leadTimeText: z.string().trim().nullable().optional(),
    warranty: z.string().trim().nullable().optional(),
    warrantyActivation: z.string().trim().nullable().optional(),
    origin: z.string().trim().nullable().optional(),
    setContents: z.array(productSetContentPieceSchema).nullable().optional(),
    visible: z.boolean().optional(),
    featured: z.boolean().optional(),
    seoTitle: z.string().trim().nullable().optional(),
    seoDescription: z.string().trim().nullable().optional(),
    taxRate: z.coerce.number().int().min(0, 'نسبة الضريبة لا يمكن أن تكون سالبة').optional(),
    translations: productTranslationsSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.price !== undefined &&
      data.oldPrice !== undefined &&
      data.oldPrice !== null
    ) {
      if (data.oldPrice <= data.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'السعر القديم يجب أن يكون أكبر من السعر الحالي',
          path: ['oldPrice'],
        })
      }
    }
  })

export type UpdateProductInput = z.input<typeof updateProductSchema>
export type UpdateProductOutput = z.output<typeof updateProductSchema>

/**
 * Admin Product Query Schema
 */
export const ADMIN_PRODUCT_STATUSES = ['active', 'hidden', 'archived', 'all'] as const
export type AdminProductStatus = (typeof ADMIN_PRODUCT_STATUSES)[number]

export const ADMIN_PRODUCT_SORTS = ['updated', 'name', 'price', 'stock'] as const
export type AdminProductSort = (typeof ADMIN_PRODUCT_SORTS)[number]

export const adminProductQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  status: z.enum(ADMIN_PRODUCT_STATUSES).optional(),
  stock: z.enum(['low', 'out']).optional(),
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
  pageSize: z.coerce.number().int().min(1).max(100, 'الحد الأقصى لحجم الصفحة 100').default(20),
  sort: z.enum(ADMIN_PRODUCT_SORTS).default('updated'),
})

export type AdminProductQueryInput = z.input<typeof adminProductQuerySchema>
export type AdminProductQueryOutput = z.output<typeof adminProductQuerySchema>

/**
 * Image operations schemas
 */
export const patchProductImageSchema = z.object({
  alt: z.string().trim().optional(),
  isReal: z.boolean().optional(),
})

export type PatchProductImageInput = z.input<typeof patchProductImageSchema>
export type PatchProductImageOutput = z.output<typeof patchProductImageSchema>

export const reorderProductImagesSchema = z.object({
  ids: z.array(z.string().trim().min(1, 'معرف غير صالح')).min(1, 'قائمة المعرفات مطلوبة'),
})

export type ReorderProductImagesInput = z.input<typeof reorderProductImagesSchema>
export type ReorderProductImagesOutput = z.output<typeof reorderProductImagesSchema>

/**
 * Validates product specs against category spec template fields.
 * Rejects unknown keys and verifies that value types match the field definition.
 */
export interface SpecValidationError {
  valid: boolean
  errors: Record<string, string[]>
}

export function validateProductSpecs(
  specs: Record<string, unknown>,
  templateFields: readonly {
    key: string
    type: 'text' | 'number' | 'boolean' | 'choice'
    options?: string[] | null
  }[],
): SpecValidationError {
  const errors: Record<string, string[]> = {}
  const fieldMap = new Map(templateFields.map((f) => [f.key, f]))

  for (const [key, val] of Object.entries(specs)) {
    if (val === null || val === undefined) {
      continue
    }

    const field = fieldMap.get(key)
    if (!field) {
      errors[key] = [`خاصية غير معروفة "${key}" في هذا القسم`]
      continue
    }

    switch (field.type) {
      case 'text':
        if (typeof val !== 'string') {
          errors[key] = [`قيمة الخاصية "${key}" يجب أن تكون نصية`]
        }
        break
      case 'number':
        if (typeof val !== 'number' || Number.isNaN(val)) {
          errors[key] = [`قيمة الخاصية "${key}" يجب أن تكون رقماً`]
        }
        break
      case 'boolean':
        if (typeof val !== 'boolean') {
          errors[key] = [`قيمة الخاصية "${key}" يجب أن تكون منطقية (true أو false)`]
        }
        break
      case 'choice':
        if (typeof val !== 'string') {
          errors[key] = [`قيمة الخاصية "${key}" يجب أن تكون نصية من ضمن الخيارات المحددة`]
        } else if (field.options && !field.options.includes(val)) {
          errors[key] = [`القيمة "${val}" غير موجودة ضمن خيارات الخاصية "${key}"`]
        }
        break
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
