import { describe, it, expect } from 'vitest'
import {
  ORDER_TYPES,
  ORDER_STATUSES,
  isOrderStatus,
  ORDER_STATUS_LABELS,
  BRIDAL_STATUSES,
  BRIDAL_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  AVAILABILITY_MODES,
  REVIEW_STATUSES,
  NOTIFY_STATUSES,
  PERMISSIONS,
  ALL_PERMISSIONS,
} from './enums.js'

describe('enums and Arabic labels', () => {
  it('defines OrderType values', () => {
    expect(ORDER_TYPES).toEqual(['order', 'bridal'])
  })

  it('maps every OrderStatus to its exact Arabic label', () => {
    expect(ORDER_STATUSES).toEqual([
      'new',
      'awaiting_payment',
      'awaiting_deposit',
      'payment_rejected',
      'confirmed',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ])
    expect(ORDER_STATUS_LABELS).toEqual({
      new: 'جديد',
      awaiting_payment: 'بانتظار الدفع',
      awaiting_deposit: 'بانتظار العربون',
      payment_rejected: 'الدفع مرفوض',
      confirmed: 'مؤكد',
      out_for_delivery: 'خرج للتوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    })
  })

  it('maps every BridalStatus to its exact Arabic label', () => {
    expect(BRIDAL_STATUSES).toEqual([
      'draft',
      'awaiting_deposit',
      'locked',
      'delivery_agreed',
      'delivered',
      'cancelled',
      'lock_expired',
    ])
    expect(BRIDAL_STATUS_LABELS).toEqual({
      draft: 'مسودة',
      awaiting_deposit: 'بانتظار العربون',
      locked: 'محجوز (السعر مثبت)',
      delivery_agreed: 'اتفقنا على التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      lock_expired: 'انتهى التثبيت',
    })
  })

  it('maps every PaymentMethod to its exact Arabic label', () => {
    expect(PAYMENT_METHODS).toEqual(['cod', 'instapay', 'vodafone_cash', 'fawry'])
    expect(PAYMENT_METHOD_LABELS).toEqual({
      cod: 'الدفع عند الاستلام',
      instapay: 'إنستا باي',
      vodafone_cash: 'فودافون كاش',
      fawry: 'فوري',
    })
  })

  it('defines AvailabilityMode, ReviewStatus, and NotifyStatus values', () => {
    expect(AVAILABILITY_MODES).toEqual(['auto', 'on_request', 'out'])
    expect(REVIEW_STATUSES).toEqual(['pending', 'approved', 'rejected'])
    expect(NOTIFY_STATUSES).toEqual(['waiting', 'sent'])
  })

  it('exposes grouped PERMISSIONS and ALL_PERMISSIONS', () => {
    expect(PERMISSIONS.orders.confirmPayment).toBe('orders.confirmPayment')
    expect(PERMISSIONS.products.import).toBe('products.import')
    expect(ALL_PERMISSIONS).toContain('orders.read')
    expect(ALL_PERMISSIONS).toContain('orders.update')
    expect(ALL_PERMISSIONS).toContain('orders.confirmPayment')
    expect(ALL_PERMISSIONS).toContain('products.read')
    expect(ALL_PERMISSIONS).toContain('products.write')
    expect(ALL_PERMISSIONS).toContain('products.import')
    expect(ALL_PERMISSIONS).toContain('bridal.manage')
    expect(ALL_PERMISSIONS).toContain('promotions.manage')
    expect(ALL_PERMISSIONS).toContain('reviews.moderate')
    expect(ALL_PERMISSIONS).toContain('content.manage')
    expect(ALL_PERMISSIONS).toContain('reports.read')
    expect(ALL_PERMISSIONS).toContain('settings.manage')
    expect(ALL_PERMISSIONS).toContain('notify.manage')
    expect(ALL_PERMISSIONS).toContain('users.manage')
    expect(ALL_PERMISSIONS).toHaveLength(14)
  })
})

describe('isOrderStatus', () => {
  it('accepts order statuses and rejects history markers', () => {
    expect(isOrderStatus('confirmed')).toBe(true)
    expect(isOrderStatus('payment_confirmed')).toBe(false)
  })
})
