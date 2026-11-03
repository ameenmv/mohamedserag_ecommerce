import type { AvailabilityState } from './availability.js'
import type { ProductFlash } from './promotions.js'
import type { ProductRating } from './reviews.js'

export interface ProductCardBrand {
  slug: string
  name: string
}

export interface ProductCardCategory {
  slug: string
  name: string
}

export interface ProductCardImage {
  url: string
  alt: string
  isReal: boolean
}

export interface ProductCardAvailability {
  state: AvailabilityState
  orderable: boolean
  maxQty: number | null
  leadTimeText: string | null
}

export interface ProductCard {
  id: string
  slug: string
  name: string
  modelCode: string
  brand: ProductCardBrand
  category: ProductCardCategory
  price: number // integer piastres
  oldPrice: number | null // integer piastres
  discountPercent: number | null // integer, null if none
  image: ProductCardImage | null
  availability: ProductCardAvailability
  flash: ProductFlash | null
  rating: ProductRating | null // approved reviews only; null when there are none
}

export const SPEC_FIELD_TYPES = ['text', 'number', 'boolean', 'choice'] as const
export type SpecFieldType = (typeof SPEC_FIELD_TYPES)[number]

export const CATEGORY_ACCENTS = [
  'green',
  'sand',
  'gold',
  'deep-teal',
  'charcoal',
  'clay',
  'olive',
  'plum',
] as const
export type CategoryAccent = (typeof CATEGORY_ACCENTS)[number]

export const CATEGORY_ILLUSTRATIONS = [
  'fridge',
  'washer',
  'tv',
  'ac',
  'cooker',
  'cookware',
  'small-appliances',
  'household',
  'default',
] as const
export type CategoryIllustration = (typeof CATEGORY_ILLUSTRATIONS)[number]

/**
 * Resolves a safe category accent, falling back to slug inference or 'green'.
 */
export function resolveCategoryAccent(
  explicit?: string | null,
  slug?: string | null,
): CategoryAccent {
  if (explicit && (CATEGORY_ACCENTS as readonly string[]).includes(explicit)) {
    return explicit as CategoryAccent
  }
  if (slug) {
    const clean = slug.toLowerCase().trim()
    if (clean.includes('fridge') || clean.includes('refrigerat')) return 'deep-teal'
    if (clean.includes('wash')) return 'charcoal'
    if (clean.includes('tv') || clean.includes('screen')) return 'plum'
    if (clean.includes('ac') || clean.includes('condition')) return 'sand'
    if (clean.includes('cooker')) return 'clay'
    if (clean.includes('cookware')) return 'gold'
    if (clean.includes('small-appliance')) return 'olive'
    if (clean.includes('household')) return 'green'
  }
  return 'green'
}

/**
 * Resolves a category illustration, deriving from slug when not specified or 'default'.
 */
export function resolveCategoryIllustration(
  explicitOrSlug?: string | null,
  fallbackSlugOrExplicit?: string | null,
): CategoryIllustration {
  // 1. Check if first arg is an explicit illustration key
  if (explicitOrSlug && (CATEGORY_ILLUSTRATIONS as readonly string[]).includes(explicitOrSlug)) {
    return explicitOrSlug as CategoryIllustration
  }
  // 2. Check if second arg is an explicit illustration key
  if (fallbackSlugOrExplicit && (CATEGORY_ILLUSTRATIONS as readonly string[]).includes(fallbackSlugOrExplicit)) {
    return fallbackSlugOrExplicit as CategoryIllustration
  }
  // 3. Otherwise infer from either argument treated as a slug
  const target = `${explicitOrSlug ?? ''} ${fallbackSlugOrExplicit ?? ''}`.toLowerCase().trim()
  if (!target) return 'default'
  if (target.includes('fridge') || target.includes('refrigerat') || target.includes('ثلاج')) return 'fridge'
  if (target.includes('wash') || target.includes('غسال')) return 'washer'
  if (target.includes('tv') || target.includes('screen') || target.includes('شاش') || target.includes('تلفزي')) return 'tv'
  if (target.includes('ac') || target.includes('condition') || target.includes('تكييف')) return 'ac'
  if (target.includes('cooker') || target.includes('بوتاجاز') || target.includes('موقد')) return 'cooker'
  if (target.includes('cookware') || target.includes('أواني') || target.includes('حلل') || target.includes('مطبخ')) return 'cookware'
  if (target.includes('small-appliance') || target.includes('صغير')) return 'small-appliances'
  if (target.includes('household') || target.includes('منزل')) return 'household'
  return 'default'
}

export interface SpecTemplateField {
  key: string
  label: string
  type: SpecFieldType
  unit?: string | null
  options?: string[] | null
  /** English label, unit and options (same order as `options`) for the /en storefront */
  labelEn?: string | null
  unitEn?: string | null
  optionsEn?: string[] | null
  /** Display names for `options` in the requested language (the values stay Arabic for filters) */
  optionLabels?: string[] | null
  filterable: boolean
  comparable: boolean
}

export interface CategoryTreeNode {
  id: string
  name: string
  slug: string
  intro: string | null
  accent: CategoryAccent
  illustration: CategoryIllustration
  seoTitle: string | null
  seoDescription: string | null
  sort: number
  productCount: number
  children: CategoryTreeNode[]
}

export interface CategoryBreadcrumb {
  slug: string
  name: string
}

export interface CategoryDetailChild {
  id: string
  slug: string
  name: string
  productCount: number
}

export interface CategoryDetail {
  id: string
  name: string
  slug: string
  intro: string | null
  accent: CategoryAccent
  illustration: CategoryIllustration
  seoTitle: string | null
  seoDescription: string | null
  parent: CategoryBreadcrumb | null
  children: CategoryDetailChild[]
  fields: SpecTemplateField[]
}

export interface BrandSummary {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  productCount: number
}

export interface BrandDetail {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  intro: string | null
  seoTitle: string | null
  seoDescription: string | null
  productCount: number
}

export interface CatalogFacetBrand {
  slug: string
  name: string
  count: number
}

export interface CatalogFacetPrice {
  min: number | null // in EGP
  max: number | null // in EGP
}

export interface CatalogFacets {
  brands: CatalogFacetBrand[]
  price: CatalogFacetPrice
}

export interface ProductListResponse {
  items: ProductCard[]
  total: number
  page: number
  pageSize: number
  facets: CatalogFacets
}

export interface ProductDetailMergedSpec {
  key: string
  label: string
  value: string | number | boolean
  unit: string | null
  type: SpecFieldType
}

export interface ProductDetailImage {
  id: string
  url: string
  alt: string
  isReal: boolean
  sort: number
}

export interface ProductDetail {
  id: string
  slug: string
  name: string
  modelCode: string
  price: number // integer piastres
  oldPrice: number | null // integer piastres
  discountPercent: number | null
  image: ProductCardImage | null
  availability: ProductCardAvailability
  flash: ProductFlash | null
  rating: ProductRating | null // approved reviews only; null when there are none
  images: ProductDetailImage[]
  specs: ProductDetailMergedSpec[]
  setContents: unknown[] | null
  warranty: string | null
  warrantyActivation: string | null
  origin: string | null
  leadTimeText: string | null
  taxRate: number
  seoTitle: string | null
  seoDescription: string | null
  category: {
    slug: string
    name: string
    parent: CategoryBreadcrumb | null
  }
  brand: {
    slug: string
    name: string
    logoUrl: string | null
  }
  related: ProductCard[]
}

export const CATALOG_SORTS = ['popular', 'price_asc', 'price_desc', 'discount', 'newest', 'relevance'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

export const CATALOG_AVAILABILITY_FILTERS = ['in_stock', 'low', 'on_request', 'out'] as const
export type CatalogAvailabilityFilter = (typeof CATALOG_AVAILABILITY_FILTERS)[number]
