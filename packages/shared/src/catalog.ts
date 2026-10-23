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
