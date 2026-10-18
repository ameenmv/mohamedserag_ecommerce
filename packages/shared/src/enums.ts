export const ORDER_TYPES = ['order', 'bridal'] as const
export const orderTypes = ORDER_TYPES
export type OrderType = (typeof ORDER_TYPES)[number]

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  order: 'طلب شراء',
  bridal: 'حجز عروسة',
}
export const orderTypeLabels = ORDER_TYPE_LABELS

export const ORDER_STATUSES = [
  'new',
  'awaiting_payment',
  'awaiting_deposit',
  'payment_rejected',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const
export const orderStatuses = ORDER_STATUSES
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Narrows an arbitrary string (e.g. an order-history marker) to an OrderStatus. */
export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  awaiting_payment: 'بانتظار الدفع',
  awaiting_deposit: 'بانتظار العربون',
  payment_rejected: 'الدفع مرفوض',
  confirmed: 'مؤكد',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}
export const orderStatusLabels = ORDER_STATUS_LABELS

export const BRIDAL_STATUSES = [
  'awaiting_deposit',
  'locked',
  'delivery_agreed',
  'delivered',
  'cancelled',
  'lock_expired',
] as const
export const bridalStatuses = BRIDAL_STATUSES
export type BridalStatus = (typeof BRIDAL_STATUSES)[number]

export const BRIDAL_STATUS_LABELS: Record<BridalStatus, string> = {
  awaiting_deposit: 'بانتظار العربون',
  locked: 'محجوز (السعر مثبت)',
  delivery_agreed: 'اتفقنا على التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  lock_expired: 'انتهى التثبيت',
}
export const bridalStatusLabels = BRIDAL_STATUS_LABELS

export const PAYMENT_METHODS = ['cod', 'instapay', 'vodafone_cash', 'fawry'] as const
export const paymentMethods = PAYMENT_METHODS
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'الدفع عند الاستلام',
  instapay: 'إنستا باي',
  vodafone_cash: 'فودافون كاش',
  fawry: 'فوري',
}
export const paymentMethodLabels = PAYMENT_METHOD_LABELS

export const AVAILABILITY_MODES = ['auto', 'on_request', 'out'] as const
export const availabilityModes = AVAILABILITY_MODES
export type AvailabilityMode = (typeof AVAILABILITY_MODES)[number]

export const AVAILABILITY_MODE_LABELS: Record<AvailabilityMode, string> = {
  auto: 'تلقائي حسب المخزون',
  on_request: 'متاح بالطلب',
  out: 'نفذ',
}
export const availabilityModeLabels = AVAILABILITY_MODE_LABELS

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const
export const reviewStatuses = REVIEW_STATUSES
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}
export const reviewStatusLabels = REVIEW_STATUS_LABELS

export const NOTIFY_STATUSES = ['waiting', 'sent'] as const
export const notifyStatuses = NOTIFY_STATUSES
export type NotifyStatus = (typeof NOTIFY_STATUSES)[number]

export const NOTIFY_STATUS_LABELS: Record<NotifyStatus, string> = {
  waiting: 'بانتظار التوفر',
  sent: 'تم الإرسال',
}
export const notifyStatusLabels = NOTIFY_STATUS_LABELS

export const PERMISSIONS = {
  orders: {
    read: 'orders.read',
    update: 'orders.update',
    confirmPayment: 'orders.confirmPayment',
  },
  products: {
    read: 'products.read',
    write: 'products.write',
    import: 'products.import',
  },
  bridal: {
    manage: 'bridal.manage',
  },
  promotions: {
    manage: 'promotions.manage',
  },
  reviews: {
    moderate: 'reviews.moderate',
  },
  content: {
    manage: 'content.manage',
  },
  reports: {
    read: 'reports.read',
  },
  settings: {
    manage: 'settings.manage',
  },
  notify: {
    manage: 'notify.manage',
  },
  users: {
    manage: 'users.manage',
  },
} as const

export const ALL_PERMISSIONS = [
  PERMISSIONS.orders.read,
  PERMISSIONS.orders.update,
  PERMISSIONS.orders.confirmPayment,
  PERMISSIONS.products.read,
  PERMISSIONS.products.write,
  PERMISSIONS.products.import,
  PERMISSIONS.bridal.manage,
  PERMISSIONS.promotions.manage,
  PERMISSIONS.reviews.moderate,
  PERMISSIONS.content.manage,
  PERMISSIONS.reports.read,
  PERMISSIONS.settings.manage,
  PERMISSIONS.notify.manage,
  PERMISSIONS.users.manage,
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

/** Phase 1 has one role holding every permission (PRD US-12.1); more roles come in Phase 2 (US-19.2). */
export const OWNER_ROLE_KEY = 'owner'
