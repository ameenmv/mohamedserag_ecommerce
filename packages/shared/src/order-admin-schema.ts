import type { OrderStatus, PaymentMethod } from './enums.js'

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

export interface AdminOrderDetail {
  id: string
  no: string
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

export interface AdminConfirmSummary {
  orderId: string
  no: string
  status: OrderStatus
  statusLabel: string
  customerFirstName: string
  total: number
  paidAmount: number
  expectedAmount: number
  method: PaymentMethod
  methodLabel: string
  deposit: AdminOrderDeposit | null
  canConfirm: boolean
  canReject: boolean
  rejectWhatsappUrl?: string
  shortages?: OrderStockShortage[]
}
