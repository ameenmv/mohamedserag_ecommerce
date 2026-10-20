import { describe, expect, it } from 'vitest'
import type { AdminOrderDetail } from '@serag/shared'
import {
  actionsFor,
  buildStatusTabs,
  buildStatusWhatsappUrl,
  deserializeOrdersQuery,
  serializeOrdersQuery,
  statusBadgeClass,
  statusTone,
} from '../app/utils/admin-orders'

function makeMockDetail(overrides: Partial<AdminOrderDetail> = {}): AdminOrderDetail {
  return {
    id: 'ord-123',
    no: 'SR-2026-000101',
    status: 'awaiting_payment',
    statusLabel: 'بانتظار الدفع',
    createdAt: '2026-10-18T12:00:00.000Z',
    customer: {
      name: 'محمود عبد العزيز',
      phone: '01012345678',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address: 'شارع المشاية',
      notes: null,
    },
    zoneId: 'zone-1',
    items: [
      {
        name: 'ثلاجة شارب 18 قدم',
        modelCode: 'SH-REF-18',
        qty: 1,
        unitPrice: 2500000,
        lineTotal: 2500000,
        taxRate: 14,
        productId: 'prod-1',
      },
    ],
    subtotal: 2500000,
    discount: 0,
    deliveryFee: 10000,
    total: 2510000,
    paymentMethod: 'instapay',
    deposit: null,
    paidAmount: 0,
    remaining: 2510000,
    depositRemaining: 0,
    payments: [],
    events: [],
    whatsappMessages: [],
    internalNotes: null,
    confirmToken: 'token-abc',
    allowedTransitions: ['confirmed', 'cancelled'],
    canConfirmPayment: true,
    canRejectPayment: true,
    defaultConfirmAmount: 2510000,
    ...overrides,
  }
}

describe('admin-orders utils - statusTone and statusBadgeClass', () => {
  it('maps order statuses to appropriate shadcn badge tones', () => {
    expect(statusTone('confirmed')).toBe('default')
    expect(statusTone('out_for_delivery')).toBe('default')
    expect(statusTone('delivered')).toBe('default')
    expect(statusTone('payment_rejected')).toBe('destructive')
    expect(statusTone('cancelled')).toBe('outline')
    expect(statusTone('new')).toBe('secondary')
    expect(statusTone('awaiting_payment')).toBe('secondary')
  })

  it('returns valid CSS classes for badge styling', () => {
    expect(statusBadgeClass('delivered')).toContain('bg-emerald-600')
    expect(statusBadgeClass('confirmed')).toContain('bg-serag-night')
    expect(statusBadgeClass('payment_rejected')).toContain('bg-destructive')
    expect(statusBadgeClass('cancelled')).toContain('border-border')
  })
})

describe('admin-orders utils - buildStatusTabs', () => {
  it('builds tabs with all count and all 8 statuses', () => {
    const counts = {
      new: 2,
      awaiting_payment: 3,
      awaiting_deposit: 1,
      payment_rejected: 0,
      confirmed: 5,
      out_for_delivery: 1,
      delivered: 10,
      cancelled: 1,
    }
    const tabs = buildStatusTabs(counts, 'awaiting_payment')
    expect(tabs).toHaveLength(9) // 'all' + 8 statuses

    const allTab = tabs.find((t) => t.id === 'all')
    expect(allTab?.count).toBe(23)
    expect(allTab?.active).toBe(false)

    const awaitingTab = tabs.find((t) => t.id === 'awaiting_payment')
    expect(awaitingTab?.count).toBe(3)
    expect(awaitingTab?.active).toBe(true)
  })
})

describe('admin-orders utils - buildStatusWhatsappUrl', () => {
  it('builds prefilled whatsapp link with first name and formatted total', () => {
    const detail = makeMockDetail({ status: 'confirmed' })
    const res = buildStatusWhatsappUrl(detail)
    expect(res).not.toBeNull()
    expect(res?.templateKey).toBe('order_confirmed')
    expect(res?.variables.customerName).toBe('محمود')
    expect(res?.variables.orderNo).toBe('SR-2026-000101')
    expect(res?.url).toContain('https://wa.me/201012345678')
    expect(decodeURIComponent(res!.url)).toContain('SR-2026-000101')
  })

  it('includes reason when rejecting payment or provided', () => {
    const detail = makeMockDetail({
      status: 'payment_rejected',
      payments: [
        {
          id: 'pay-1',
          method: 'instapay',
          amount: 50000,
          status: 'rejected',
          rejectReason: 'الصورة مش واضحة',
          at: '2026-10-18T12:00:00Z',
          adminName: 'أدمن',
        },
      ],
    })
    const res = buildStatusWhatsappUrl(detail)
    expect(res?.templateKey).toBe('payment_rejected')
    expect(res?.variables.reason).toBe('الصورة مش واضحة')
    expect(decodeURIComponent(res!.url)).toContain('الصورة مش واضحة')
  })

  it('returns null for statuses without a template (e.g. new)', () => {
    const detail = makeMockDetail({ status: 'new' })
    expect(buildStatusWhatsappUrl(detail)).toBeNull()
  })
})

describe('admin-orders utils - actionsFor', () => {
  it('returns action capabilities and transitions with reason flag', () => {
    const detail = makeMockDetail({
      allowedTransitions: ['confirmed', 'cancelled'],
      canConfirmPayment: true,
      canRejectPayment: false,
    })
    const actions = actionsFor(detail)
    expect(actions.canConfirmPayment).toBe(true)
    expect(actions.canRejectPayment).toBe(false)
    expect(actions.transitions).toEqual([
      {
        to: 'confirmed',
        labelKey: 'admin.orders.detail.transition.confirmed',
        requiresReason: false,
      },
      {
        to: 'cancelled',
        labelKey: 'admin.orders.detail.transition.cancelled',
        requiresReason: true,
      },
    ])
  })
})

describe('admin-orders utils - query serialization and deserialization', () => {
  it('deserializes route query parameters into clean types', () => {
    const res = deserializeOrdersQuery({
      type: 'bridal',
      q: '  SR-2026  ',
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      from: '2026-10-01',
      to: '2026-10-18',
      page: '3',
      pageSize: '50',
    })
    expect(res).toEqual({
      type: 'bridal',
      q: 'SR-2026',
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      from: '2026-10-01',
      to: '2026-10-18',
      page: 3,
      pageSize: 50,
    })
  })

  it('serializes state into URL query params, skipping defaults and empties', () => {
    const query = serializeOrdersQuery({
      type: 'bridal',
      q: 'SR-2026',
      status: 'confirmed',
      page: 2,
      pageSize: 20, // default, should not be in query
    })
    expect(query).toEqual({
      type: 'bridal',
      q: 'SR-2026',
      status: 'confirmed',
      page: 2,
    })
  })
})
