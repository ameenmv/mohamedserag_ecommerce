import { z } from 'zod'
import { orderStatusSchema, orderTypeSchema, paymentMethodSchema } from './enums-schema.js'
import type { BridalStatus, OrderStatus, OrderType, PaymentMethod } from './enums.js'
import { phoneSchema } from './phone-schema.js'
import { DEFAULT_TEMPLATES, type WhatsAppTemplateKey } from './whatsapp.js'

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates list query parameters for `GET /admin/orders`.
 * `from` and `to` are ISO date strings (YYYY-MM-DD) representing UTC day bounds
 * (from 00:00:00.000Z to 23:59:59.999Z). Inclusive Cairo timezone day range is not needed.
 */
export const adminOrderListQuerySchema = z.object({
  type: orderTypeSchema.optional(),
  status: orderStatusSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  from: z
    .string()
    .trim()
    .regex(ISO_DATE_REGEX, 'تاريخ البداية غير صالح (YYYY-MM-DD)')
    .optional(),
  to: z
    .string()
    .trim()
    .regex(ISO_DATE_REGEX, 'تاريخ النهاية غير صالح (YYYY-MM-DD)')
    .optional(),
  q: z
    .string()
    .trim()
    .max(60, 'نص البحث لا يمكن أن يتجاوز 60 حرف')
    .optional(),
  page: z.coerce
    .number()
    .int()
    .min(1, 'رقم الصفحة يبدأ من 1')
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى لحجم الصفحة 1')
    .max(100, 'الحد الأقصى لحجم الصفحة 100')
    .default(20),
})

export type AdminOrderListQueryInput = z.input<typeof adminOrderListQuerySchema>
export type AdminOrderListQueryOutput = z.output<typeof adminOrderListQuerySchema>

export const orderNotesSchema = z.object({
  internalNotes: z
    .string()
    .trim()
    .max(2000, 'الملاحظات الداخلية لا يمكن أن تتجاوز 2000 حرف'),
})

export type OrderNotesInput = z.input<typeof orderNotesSchema>
export type OrderNotesOutput = z.output<typeof orderNotesSchema>

const whatsappTemplateKeys = Object.keys(DEFAULT_TEMPLATES) as [
  WhatsAppTemplateKey,
  ...WhatsAppTemplateKey[],
]

export const whatsappLogSchema = z.object({
  templateKey: z.enum(whatsappTemplateKeys, {
    message: 'قالب واتساب غير صالح',
  }),
  to: phoneSchema,
  variables: z.record(z.string(), z.union([z.string(), z.number()])),
})

export type WhatsAppLogInput = z.input<typeof whatsappLogSchema>
export type WhatsAppLogOutput = z.output<typeof whatsappLogSchema>

export interface AdminOrderRow {
  id: string
  no: string
  type: OrderType
  createdAt: Date | string
  customerName: string
  customerPhone: string
  governorate: string
  city: string
  itemCount: number
  total: number
  paidAmount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  bridalStatus?: BridalStatus | null
  lockExpired?: boolean
  lockDaysLeft?: number | null
}

export interface AdminOrderListResponse {
  items: AdminOrderRow[]
  total: number
  page: number
  pageSize: number
  counts: Record<OrderStatus, number>
}

export interface OrderStockShortage {
  productId: string
  name: string
  requested: number
  taken: number
}

export interface AdminOrderCustomer {
  name: string
  phone: string
  governorate: string
  city: string
  address: string
  notes: string | null
}

export interface AdminOrderItem {
  name: string
  modelCode: string
  qty: number
  unitPrice: number
  lineTotal: number
  taxRate: number
  productId: string | null
}

export interface AdminOrderDeposit {
  pct: number
  amount: number
}

export interface AdminOrderPayment {
  id: string
  method: PaymentMethod
  amount: number
  status: 'confirmed' | 'rejected'
  rejectReason: string | null
  at: Date | string
  adminName: string | null
}

export interface AdminOrderEvent {
  status: string
  note: string | null
  at: Date | string
  adminName: string | null
}

export interface AdminOrderWhatsAppMessage {
  templateKey: string
  at: Date | string
  adminName: string | null
}

export interface AdminOrderBridalDetail {
  status: BridalStatus | null
  lockDays: number | null
  lockedUntil: Date | string | null
  lockExpired: boolean
  lockDaysLeft: number | null
  preferredDate: Date | string | null
  agreedDeliveryDate: Date | string | null
  listShareToken: string | null
}

export interface AdminOrderDetail {
  id: string
  no: string
  type: OrderType
  bridal: AdminOrderBridalDetail | null
  status: OrderStatus
  statusLabel: string
  createdAt: Date | string
  customer: AdminOrderCustomer
  zoneId: string
  items: AdminOrderItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  paymentMethod: PaymentMethod
  deposit: AdminOrderDeposit | null
  paidAmount: number
  remaining: number
  depositRemaining: number
  payments: AdminOrderPayment[]
  events: AdminOrderEvent[]
  whatsappMessages: AdminOrderWhatsAppMessage[]
  internalNotes: string | null
  confirmToken: string | null
  allowedTransitions: OrderStatus[]
  canConfirmPayment: boolean
  canRejectPayment: boolean
  defaultConfirmAmount: number
  shortages?: OrderStockShortage[]
}

export interface AdminConfirmDepositDetails extends AdminOrderDeposit {
  paid?: number
  required?: number
  remaining?: number
}

export interface AdminConfirmSummary {
  orderId: string
  no: string
  type?: OrderType
  status: OrderStatus
  statusLabel: string
  customerFirstName: string
  total: number
  paidAmount: number
  expectedAmount: number
  method: PaymentMethod
  methodLabel: string
  deposit: AdminConfirmDepositDetails | null
  depositAmount?: number | null
  depositRemaining?: number
  lockDays?: number | null
  canConfirm: boolean
  canReject: boolean
  rejectWhatsappUrl?: string
  confirmWhatsappUrl?: string
  shortages?: OrderStockShortage[]
  locked?: {
    lockedUntil: Date | string
  } | null
}
