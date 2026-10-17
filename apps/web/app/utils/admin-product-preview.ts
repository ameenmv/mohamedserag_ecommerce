import type { AvailabilityMode, ProductCard } from '@serag/shared'
import { deriveAvailability } from '@serag/shared'
import { calculateDiscountPercent } from './admin-money'

export interface ProductPreviewDraft {
  id?: string
  name: string
  modelCode: string
  slug?: string
  brandId?: string
  categoryId?: string
  price: number // integer piastres
  oldPrice?: number | null // integer piastres
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
  leadTimeText?: string | null
  images?: Array<{ url: string; alt?: string; isReal?: boolean }>
}

export interface ProductPreviewContext {
  brands?: ReadonlyArray<{ id: string; name: string; slug: string }>
  categories?: ReadonlyArray<{ id: string; name: string; slug: string }>
}

/** Translated placeholders for empty draft fields (the caller passes them from i18n). */
export interface ProductPreviewLabels {
  defaultName: string
  defaultBrand: string
  defaultCategory: string
  defaultImageAlt: string
}

/**
 * Pure mapper that transforms unsaved admin product editor draft form values
 * into a valid `ProductCard` object suitable for rendering `<StoreProductCard>`.
 */
export function buildProductCardPreview(
  draft: ProductPreviewDraft,
  context: ProductPreviewContext | undefined,
  labels: ProductPreviewLabels,
): ProductCard {
  const price = Math.max(0, Math.round(draft.price || 0))
  const oldPrice =
    draft.oldPrice !== null && draft.oldPrice !== undefined && draft.oldPrice > price
      ? Math.round(draft.oldPrice)
      : null

  const discountPercent = calculateDiscountPercent(price, oldPrice)

  const derivedAvail = deriveAvailability({
    mode: draft.availabilityMode || 'auto',
    stock: draft.stock ?? 0,
    lowStockThreshold: draft.lowStockThreshold ?? 3,
  })

  const brandMatch = draft.brandId ? context?.brands?.find((b) => b.id === draft.brandId) : undefined
  const categoryMatch = draft.categoryId
    ? context?.categories?.find((c) => c.id === draft.categoryId)
    : undefined

  const fallbackName = labels.defaultName
  const fallbackBrand = labels.defaultBrand
  const fallbackCategory = labels.defaultCategory
  const fallbackImageAlt = labels.defaultImageAlt

  const firstImg = draft.images && draft.images.length > 0 ? draft.images[0] : null
  const image =
    firstImg && firstImg.url
      ? {
          url: firstImg.url,
          alt: firstImg.alt?.trim() || draft.name.trim() || fallbackImageAlt,
          isReal: Boolean(firstImg.isReal),
        }
      : null

  return {
    id: draft.id || 'preview',
    slug: draft.slug?.trim() || draft.modelCode?.trim().toLowerCase() || 'preview-product',
    name: draft.name?.trim() || fallbackName,
    modelCode: draft.modelCode?.trim() || '',
    brand: {
      name: brandMatch?.name || fallbackBrand,
      slug: brandMatch?.slug || 'brand',
    },
    category: {
      name: categoryMatch?.name || fallbackCategory,
      slug: categoryMatch?.slug || 'category',
    },
    price,
    oldPrice,
    discountPercent,
    image,
    availability: {
      state: derivedAvail.state,
      orderable: derivedAvail.orderable,
      maxQty: derivedAvail.maxQty,
      leadTimeText: draft.leadTimeText?.trim() || null,
    },
  }
}
