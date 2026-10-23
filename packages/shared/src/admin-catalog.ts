import type { AvailabilityState } from './availability.js'
import type { AvailabilityMode } from './enums.js'
import type { SpecFieldType } from './catalog.js'

export interface AdminSpecTemplateField {
  key: string
  label: string
  type: SpecFieldType
  unit?: string | null
  options?: string[] | null
  labelEn?: string | null
  unitEn?: string | null
  optionsEn?: string[] | null
  filterable: boolean
  comparable: boolean
}

export interface AdminSpecTemplate {
  id: string
  name: string
  fields: AdminSpecTemplateField[]
  categoryCount?: number
  createdAt: string
  updatedAt: string
}

export interface AdminCategoryTranslationsEn {
  name?: string
  intro?: string
  seoTitle?: string
  seoDescription?: string
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
  specTemplateId: string | null
  intro: string | null
  seoTitle: string | null
  seoDescription: string | null
  translations?: {
    en?: AdminCategoryTranslationsEn
  } | null
  sort: number
  visible: boolean
  productCount: number
  specTemplate?: {
    id: string
    name: string
  } | null
  parent?: {
    id: string
    name: string
    slug: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface AdminBrandTranslationsEn {
  name?: string
  intro?: string
  seoTitle?: string
  seoDescription?: string
}

export interface AdminBrand {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  intro: string | null
  seoTitle: string | null
  seoDescription: string | null
  translations?: {
    en?: AdminBrandTranslationsEn
  } | null
  sort: number
  visible: boolean
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminProductImage {
  id: string
  url: string
  alt: string
  isReal: boolean
  sort: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminProductSetContent {
  item: string
  size?: string | null
  qty?: number | null
}

export interface AdminProductListItemAvailability {
  mode: AvailabilityMode
  state: AvailabilityState
  orderable: boolean
  leadTimeText: string | null
}

export interface AdminProductListItem {
  id: string
  slug: string
  modelCode: string
  name: string
  thumbnail: string | null
  brand: {
    id: string
    name: string
    slug: string
  }
  category: {
    id: string
    name: string
    slug: string
  }
  price: number // integer piastres
  oldPrice: number | null // integer piastres
  stock: number
  lowStockThreshold: number
  visible: boolean
  archived: boolean
  archivedAt: string | null
  availability: AdminProductListItemAvailability
  translations?: {
    en?: AdminProductTranslationsEn
  } | null
  updatedAt: string
}

export interface AdminProductTranslationsEn {
  name?: string
  leadTimeText?: string
  warranty?: string
  warrantyActivation?: string
  origin?: string
  seoTitle?: string
  seoDescription?: string
  setContents?: AdminProductSetContent[]
}

export interface AdminProductDetail {
  id: string
  slug: string
  modelCode: string
  name: string
  brandId: string
  categoryId: string
  specs: Record<string, unknown>
  price: number // integer piastres
  oldPrice: number | null // integer piastres
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
  warranty: string | null
  warrantyActivation: string | null
  origin: string | null
  setContents: AdminProductSetContent[] | null
  visible: boolean
  featured: boolean
  archivedAt: string | null
  taxRate: number
  etaItemCode: string | null
  seoTitle: string | null
  seoDescription: string | null
  translations?: {
    en?: AdminProductTranslationsEn
  } | null
  images: AdminProductImage[]
  inOrders: boolean
  brand: {
    id: string
    name: string
    slug: string
  }
  category: {
    id: string
    name: string
    slug: string
  }
  createdAt: string
  updatedAt: string
}

export interface AdminProductListResponse {
  items: AdminProductListItem[]
  total: number
  page: number
  pageSize: number
}
