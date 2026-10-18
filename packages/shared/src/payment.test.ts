import { describe, it, expect } from 'vitest'
import {
  PAYMENT_CONFIRMABLE_STATUSES,
  PAYMENT_ADDABLE_STATUSES,
  isPaymentConfirmable,
  isPaymentAddable,
  remainingAmount,
  depositRemaining,
  defaultConfirmAmount,
  manualStatusTargets,
} from './payment.js'
import {
  confirmPaymentInputSchema,
  rejectPaymentInputSchema,
  orderStatusChangeSchema,
} from './payment-schema.js'

describe('confirmPaymentInputSchema', () => {
  it('accepts valid positive integer amounts and optional notes', () => {
    const parsed = confirmPaymentInputSchema.parse({ amount: 50000, note: 'تحويل إنستا باي معتمد' })
    expect(parsed.amount).toBe(50000)
    expect(parsed.note).toBe('تحويل إنستا باي معتمد')

    const withoutNote = confirmPaymentInputSchema.parse({ amount: 100 })
    expect(withoutNote.amount).toBe(100)
    expect(withoutNote.note).toBeUndefined()
  })

  it('rejects non-positive, fractional, or non-numeric amounts', () => {
    expect(() => confirmPaymentInputSchema.parse({ amount: 0 })).toThrow()
    expect(() => confirmPaymentInputSchema.parse({ amount: -100 })).toThrow()
    expect(() => confirmPaymentInputSchema.parse({ amount: 10.5 })).toThrow()
  })

  it('rejects notes exceeding 300 characters', () => {
    expect(() => confirmPaymentInputSchema.parse({ amount: 1000, note: 'x'.repeat(301) })).toThrow()
  })
})

describe('rejectPaymentInputSchema', () => {
  it('accepts reasons between 3 and 300 characters', () => {
    const res = rejectPaymentInputSchema.parse({ reason: 'صورة الإيصال غير واضحة' })
    expect(res.reason).toBe('صورة الإيصال غير واضحة')
  })

  it('rejects reasons shorter than 3 characters or longer than 300 characters', () => {
    expect(() => rejectPaymentInputSchema.parse({ reason: 'لا' })).toThrow()
    expect(() => rejectPaymentInputSchema.parse({ reason: '   ' })).toThrow()
    expect(() => rejectPaymentInputSchema.parse({ reason: 'x'.repeat(301) })).toThrow()
  })
})

describe('orderStatusChangeSchema', () => {
  it('accepts status transitions without reason when status is not cancelled', () => {
    const res = orderStatusChangeSchema.parse({ to: 'out_for_delivery' })
    expect(res.to).toBe('out_for_delivery')
    expect(res.reason).toBeUndefined()
  })

  it('accepts status transitions with optional reason >= 3 chars for non-cancelled status', () => {
    const res = orderStatusChangeSchema.parse({ to: 'out_for_delivery', reason: 'خرج مع المندوب أحمد' })
    expect(res.to).toBe('out_for_delivery')
    expect(res.reason).toBe('خرج مع المندوب أحمد')
  })

  it('requires reason with at least 3 characters when transitioning to cancelled', () => {
    const valid = orderStatusChangeSchema.parse({ to: 'cancelled', reason: 'طلب العميل إلغاء الطلب' })
    expect(valid.to).toBe('cancelled')
    expect(valid.reason).toBe('طلب العميل إلغاء الطلب')

    expect(() => orderStatusChangeSchema.parse({ to: 'cancelled' })).toThrow()
    expect(() => orderStatusChangeSchema.parse({ to: 'cancelled', reason: '  ' })).toThrow()
    expect(() => orderStatusChangeSchema.parse({ to: 'cancelled', reason: 'لا' })).toThrow()
  })
})

describe('payment amount calculations', () => {
  it('calculates remainingAmount as total minus paidAmount, floored at 0', () => {
    expect(remainingAmount({ total: 100000, paidAmount: 40000 })).toBe(60000)
    expect(remainingAmount({ total: 100000, paidAmount: 100000 })).toBe(0)
    expect(remainingAmount({ total: 100000, paidAmount: 120000 })).toBe(0)
  })

  it('calculates depositRemaining as depositAmount minus paidAmount, floored at 0', () => {
    expect(depositRemaining({ depositAmount: 30000, paidAmount: 10000 })).toBe(20000)
    expect(depositRemaining({ depositAmount: 30000, paidAmount: 30000 })).toBe(0)
    expect(depositRemaining({ depositAmount: null, paidAmount: 0 })).toBe(0)
  })

  it('calculates defaultConfirmAmount according to status and deposit status', () => {
    // awaiting_deposit -> returns depositRemaining
    expect(
      defaultConfirmAmount({
        status: 'awaiting_deposit',
        total: 500000,
        paidAmount: 0,
        depositAmount: 50000,
      }),
    ).toBe(50000)

    // payment_rejected with unpaid deposit -> returns depositRemaining
    expect(
      defaultConfirmAmount({
        status: 'payment_rejected',
        total: 500000,
        paidAmount: 10000,
        depositAmount: 50000,
      }),
    ).toBe(40000)

    // payment_rejected with fully paid deposit -> returns remainingAmount
    expect(
      defaultConfirmAmount({
        status: 'payment_rejected',
        total: 500000,
        paidAmount: 50000,
        depositAmount: 50000,
      }),
    ).toBe(450000)

    // awaiting_payment -> returns remainingAmount
    expect(
      defaultConfirmAmount({
        status: 'awaiting_payment',
        total: 200000,
        paidAmount: 50000,
        depositAmount: null,
      }),
    ).toBe(150000)

    // confirmed -> returns remainingAmount
    expect(
      defaultConfirmAmount({
        status: 'confirmed',
        total: 200000,
        paidAmount: 150000,
        depositAmount: null,
      }),
    ).toBe(50000)
  })
})

describe('manualStatusTargets and status groups', () => {
  it('defines PAYMENT_CONFIRMABLE_STATUSES and PAYMENT_ADDABLE_STATUSES', () => {
    expect(PAYMENT_CONFIRMABLE_STATUSES).toEqual([
      'awaiting_payment',
      'awaiting_deposit',
      'payment_rejected',
    ])
    expect(PAYMENT_ADDABLE_STATUSES).toEqual(['confirmed', 'out_for_delivery', 'delivered'])
  })

  it('returns appropriate manual status choices for each status', () => {
    // COD new: confirmed (by phone) is allowed, cancelled is allowed
    expect(manualStatusTargets('new')).toEqual(['confirmed', 'cancelled'])

    // awaiting_payment: confirm goes through payment action; payment_rejected goes through payment action
    expect(manualStatusTargets('awaiting_payment')).toEqual(['cancelled'])

    // awaiting_deposit: confirm and reject go through payment action
    expect(manualStatusTargets('awaiting_deposit')).toEqual(['cancelled'])

    // payment_rejected: confirm goes through payment action
    expect(manualStatusTargets('payment_rejected')).toEqual(['cancelled'])

    // confirmed: can move to out_for_delivery or cancelled
    expect(manualStatusTargets('confirmed')).toEqual(['out_for_delivery', 'cancelled'])

    // out_for_delivery: can move to delivered or cancelled
    expect(manualStatusTargets('out_for_delivery')).toEqual(['delivered', 'cancelled'])

    // delivered and cancelled are final
    expect(manualStatusTargets('delivered')).toEqual([])
    expect(manualStatusTargets('cancelled')).toEqual([])
  })

  it('identifies confirmable and addable statuses using type guards', () => {
    expect(isPaymentConfirmable('awaiting_payment')).toBe(true)
    expect(isPaymentConfirmable('awaiting_deposit')).toBe(true)
    expect(isPaymentConfirmable('payment_rejected')).toBe(true)
    expect(isPaymentConfirmable('new')).toBe(false)
    expect(isPaymentConfirmable('confirmed')).toBe(false)
    expect(isPaymentConfirmable('out_for_delivery')).toBe(false)
    expect(isPaymentConfirmable('delivered')).toBe(false)
    expect(isPaymentConfirmable('cancelled')).toBe(false)

    expect(isPaymentAddable('confirmed')).toBe(true)
    expect(isPaymentAddable('out_for_delivery')).toBe(true)
    expect(isPaymentAddable('delivered')).toBe(true)
    expect(isPaymentAddable('new')).toBe(false)
    expect(isPaymentAddable('awaiting_payment')).toBe(false)
    expect(isPaymentAddable('awaiting_deposit')).toBe(false)
    expect(isPaymentAddable('payment_rejected')).toBe(false)
    expect(isPaymentAddable('cancelled')).toBe(false)
  })
})

