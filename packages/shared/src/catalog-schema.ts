import { z } from 'zod'
import {
  CATALOG_SORTS,
  CATALOG_AVAILABILITY_FILTERS,
  SPEC_FIELD_TYPES,
  type CatalogSort,
} from './catalog.js'

export const catalogSortSchema = z.enum(CATALOG_SORTS)
export const catalogAvailabilityFilterSchema = z.enum(CATALOG_AVAILABILITY_FILTERS)
export const specFieldTypeSchema = z.enum(SPEC_FIELD_TYPES)

/**
 * Validates category spec template field definitions (PRD US-1.5).
 * Normalizes legacy/seed 'select' to 'choice' so type is always text|number|boolean|choice.
 */
export const specTemplateFieldSchema = z.object({
  key: z.string().min(1, 'مفتاح الخاصية مطلوب'),
  label: z.string().min(1, 'اسم الخاصية مطلوب'),
  type: z.preprocess((val) => (val === 'select' ? 'choice' : val), specFieldTypeSchema),
  unit: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  labelEn: z.string().nullable().optional(),
  unitEn: z.string().nullable().optional(),
  optionsEn: z.array(z.string()).nullable().optional(),
  optionLabels: z.array(z.string()).nullable().optional(),
  filterable: z.boolean().default(false),
  comparable: z.boolean().default(false),
})

/**
 * Validates the query string for `GET /api/products`.
 * Reused by web for URL query synchronization.
 */
export const productQuerySchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().int().min(0, 'السعر الأدنى لا يمكن أن يكون سالباً').optional(),
    maxPrice: z.coerce.number().int().min(0, 'السعر الأقصى لا يمكن أن يكون سالباً').optional(),
    availability: z.string().trim().min(1).optional(),
    discounted: z
      .preprocess((val) => {
        if (val === 'true' || val === true) return true
        if (val === 'false' || val === false) return false
        return undefined
      }, z.boolean().optional()),
    sort: catalogSortSchema.optional(),
    page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
    pageSize: z.coerce.number().int().min(1).max(60, 'الحد الأقصى لحجم الصفحة هو 60').default(24),
    ids: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).max(100).optional(),
  })
  .passthrough()
  .refine(
    (data) => {
      if (!data.ids) return true
      const idList = data.ids.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
      return idList.length <= 60
    },
    { message: 'الحد الأقصى لعدد المعرفات هو 60 منتج', path: ['ids'] },
  )

export type ProductQueryInput = z.input<typeof productQuerySchema>
export type ProductQueryOutput = z.output<typeof productQuerySchema>

/**
 * Resolves the effective catalog sort (PRD US-2.1 & US-2.2):
 * - If explicit sort is provided, returns it
 * - If q is present (non-empty), defaults to 'relevance'
 * - Otherwise defaults to 'popular'
 */
export function resolveCatalogSort(query: { sort?: CatalogSort; q?: string }): CatalogSort {
  if (query.sort) {
    return query.sort
  }
  if (query.q && query.q.trim().length > 0) {
    return 'relevance'
  }
  return 'popular'
}

