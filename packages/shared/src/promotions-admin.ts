import type { CouponStatus, CouponType, FlashStatus } from './promotions.js'

export interface AdminFlashSaleRow {
  id: string
  name: string
  startsAt: string
  endsAt: string
  status: FlashStatus
  itemCount: number
}

export interface AdminFlashSaleItem {
  productId: string
  productName: string
  modelCode: string | null
  regularPrice: number
  salePrice: number
}

export interface AdminFlashSaleDetail extends AdminFlashSaleRow {
  items: AdminFlashSaleItem[]
}

export interface AdminFlashSaleListResponse {
  items: AdminFlashSaleRow[]
  total: number
  page: number
  pageSize: number
}

export interface AdminCouponRow {
  id: string
  code: string
  type: CouponType
  value: number
  minOrder: number
  startsAt: string | null
  endsAt: string | null
  maxUses: number | null
  maxUsesPerPhone: number | null
  categoryIds: string[]
  brandIds: string[]
  active: boolean
  status: CouponStatus
  activeUses: number
  totalDiscount: number
}

export interface AdminCouponListResponse {
  items: AdminCouponRow[]
  total: number
  page: number
  pageSize: number
}

export type AdminCouponDeleteResponse = { deactivated: true } | { deleted: true }
