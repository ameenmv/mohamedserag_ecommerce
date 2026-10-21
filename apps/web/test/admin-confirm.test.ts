import { describe, expect, it } from 'vitest'
import type { AdminConfirmSummary } from '@serag/shared'
import {
  confirmViewState,
  mapConfirmErrorKey,
  parseConfirmAmountEgp,
  remainingPiastres,
  validateRejectReason,
} from '../app/utils/admin-confirm'

function makeMockSummary(overrides: Partial<AdminConfirmSummary> = {}): AdminConfirmSummary {
  return {
    orderId: 'order-123',
    no: 'SR-2026-000101',
    status: 'awaiting_payment',
    statusLabel: 'بانتظار الدفع',
    customerFirstName: 'محمود',
    total: 100000, // 1,000 EGP
    paidAmount: 0,
    expectedAmount: 100000,
    method: 'instapay',
    methodLabel: 'إنستا باي',
    deposit: null,
    canConfirm: true,
    canReject: true,
    ...overrides,
  }
}

describe('admin-confirm utils - parseConfirmAmountEgp', () => {
  it('parses whole integer EGP amounts to piastres', () => {
    const res = parseConfirmAmountEgp('500')
    expect(res).toEqual({ success: true, piastres: 50000 })
  })

  it('parses decimal EGP amounts to piastres', () => {
    const res1 = parseConfirmAmountEgp('500.5')
    expect(res1).toEqual({ success: true, piastres: 50050 })

    const res2 = parseConfirmAmountEgp('12.75')
    expect(res2).toEqual({ success: true, piastres: 1275 })
  })

  it('accepts commas as decimal separators when 1 or 2 fractional digits are supplied', () => {
    const res1 = parseConfirmAmountEgp('500,5')
    expect(res1).toEqual({ success: true, piastres: 50050 })

    const res2 = parseConfirmAmountEgp('500,50')
    expect(res2).toEqual({ success: true, piastres: 50050 })
  })

  it('accepts commas as thousands separators when followed by 3 digits', () => {
    const res1 = parseConfirmAmountEgp('1,000')
    expect(res1).toEqual({ success: true, piastres: 100000 })

    const res2 = parseConfirmAmountEgp('35,000')
    expect(res2).toEqual({ success: true, piastres: 3500000 })

    const res3 = parseConfirmAmountEgp('35,000.50')
    expect(res3).toEqual({ success: true, piastres: 3500050 })

    const res4 = parseConfirmAmountEgp('1,000,000')
    expect(res4).toEqual({ success: true, piastres: 100000000 })
  })

  it('normalizes Arabic-Indic digits and Arabic decimal/thousand separators', () => {
    const res1 = parseConfirmAmountEgp('٥٠٠')
    expect(res1).toEqual({ success: true, piastres: 50000 })

    const res2 = parseConfirmAmountEgp('١٠٠٠')
    expect(res2).toEqual({ success: true, piastres: 100000 })

    const res3 = parseConfirmAmountEgp('٣٥,٠٠٠')
    expect(res3).toEqual({ success: true, piastres: 3500000 })

    // Arabic decimal separator U+066B
    const res4 = parseConfirmAmountEgp('٥٠٠٫٥')
    expect(res4).toEqual({ success: true, piastres: 50050 })

    // Arabic thousands separator U+066C
    const res5 = parseConfirmAmountEgp('١٬٠٠٠')
    expect(res5).toEqual({ success: true, piastres: 100000 })
  })

  it('normalizes Persian digits', () => {
    const res = parseConfirmAmountEgp('۵۰۰')
    expect(res).toEqual({ success: true, piastres: 50000 })
  })

  it('trims leading and trailing whitespace', () => {
    const res = parseConfirmAmountEgp('   250   ')
    expect(res).toEqual({ success: true, piastres: 25000 })
  })

  it('rejects empty or whitespace-only input', () => {
    expect(parseConfirmAmountEgp('')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountRequired',
    })
    expect(parseConfirmAmountEgp('   ')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountRequired',
    })
  })

  it('rejects non-numeric characters and malformed strings', () => {
    expect(parseConfirmAmountEgp('abc')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.invalidAmount',
    })
    expect(parseConfirmAmountEgp('10..5')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.invalidAmount',
    })
    expect(parseConfirmAmountEgp('-50')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.invalidAmount',
    })
  })

  it('rejects zero or negative amounts', () => {
    expect(parseConfirmAmountEgp('0')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountPositive',
    })
    expect(parseConfirmAmountEgp('0.00')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountPositive',
    })
  })

  it('validates against maxPiastres when provided', () => {
    const maxPiastres = 50000 // 500 EGP

    // Equal to max -> allowed
    expect(parseConfirmAmountEgp('500', maxPiastres)).toEqual({
      success: true,
      piastres: 50000,
    })

    // Less than max -> allowed
    expect(parseConfirmAmountEgp('200', maxPiastres)).toEqual({
      success: true,
      piastres: 20000,
    })

    // Exceeds max -> rejected
    expect(parseConfirmAmountEgp('500.01', maxPiastres)).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountExceedsRemaining',
    })
    expect(parseConfirmAmountEgp('600', maxPiastres)).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.amountExceedsRemaining',
    })
  })
})

describe('admin-confirm utils - remainingPiastres', () => {
  it('calculates remaining balance correctly', () => {
    const summary = makeMockSummary({ total: 100000, paidAmount: 30000 })
    expect(remainingPiastres(summary)).toBe(70000)
  })

  it('returns 0 when paid exceeds or equals total', () => {
    const summary = makeMockSummary({ total: 100000, paidAmount: 100000 })
    expect(remainingPiastres(summary)).toBe(0)

    const overpaid = makeMockSummary({ total: 100000, paidAmount: 120000 })
    expect(remainingPiastres(overpaid)).toBe(0)
  })

  it('returns 0 for null or undefined summary', () => {
    expect(remainingPiastres(null)).toBe(0)
    expect(remainingPiastres(undefined)).toBe(0)
  })
})

describe('admin-confirm utils - confirmViewState', () => {
  it('returns "actionable" when canConfirm is true regardless of status', () => {
    expect(confirmViewState(makeMockSummary({ canConfirm: true, status: 'awaiting_payment' }))).toBe('actionable')
    expect(confirmViewState(makeMockSummary({ canConfirm: true, status: 'awaiting_deposit' }))).toBe('actionable')
    expect(confirmViewState(makeMockSummary({ canConfirm: true, status: 'payment_rejected' }))).toBe('actionable')
  })

  it('returns "confirmed" when canConfirm is false and status is confirmed', () => {
    expect(confirmViewState(makeMockSummary({ canConfirm: false, status: 'confirmed' }))).toBe('confirmed')
  })

  it('returns "cancelled" when canConfirm is false and status is cancelled', () => {
    expect(confirmViewState(makeMockSummary({ canConfirm: false, status: 'cancelled' }))).toBe('cancelled')
  })

  it('returns "other" for non-confirmable other statuses or null', () => {
    expect(confirmViewState(makeMockSummary({ canConfirm: false, status: 'delivered' }))).toBe('other')
    expect(confirmViewState(makeMockSummary({ canConfirm: false, status: 'out_for_delivery' }))).toBe('other')
    expect(confirmViewState(null)).toBe('other')
    expect(confirmViewState(undefined)).toBe('other')
  })
})

describe('admin-confirm utils - validateRejectReason', () => {
  it('accepts trimmed reason between 3 and 300 characters', () => {
    const res = validateRejectReason('  الصورة مش واضحة  ')
    expect(res).toEqual({ success: true, reason: 'الصورة مش واضحة' })
  })

  it('rejects reasons shorter than 3 characters', () => {
    expect(validateRejectReason('لا')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.reasonRequired',
    })
    expect(validateRejectReason('   ')).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.reasonRequired',
    })
  })

  it('rejects reasons longer than 300 characters', () => {
    const longReason = 'أ'.repeat(301)
    expect(validateRejectReason(longReason)).toEqual({
      success: false,
      errorKey: 'admin.confirm.errors.reasonTooLong',
    })
  })
})

describe('admin-confirm utils - mapConfirmErrorKey', () => {
  it('maps numeric status codes accurately', () => {
    expect(mapConfirmErrorKey(400)).toBe('admin.confirm.errors.badRequest')
    expect(mapConfirmErrorKey(404)).toBe('admin.confirm.errors.notFound')
    expect(mapConfirmErrorKey(409)).toBe('admin.confirm.errors.conflict')
    expect(mapConfirmErrorKey(401)).toBe('admin.confirm.errors.unauthorized')
    expect(mapConfirmErrorKey(403)).toBe('admin.confirm.errors.forbidden')
    expect(mapConfirmErrorKey(500)).toBe('admin.confirm.errors.generic')
  })

  it('maps error objects with statusCode or response status', () => {
    expect(mapConfirmErrorKey({ statusCode: 404 })).toBe('admin.confirm.errors.notFound')
    expect(mapConfirmErrorKey({ status: 409 })).toBe('admin.confirm.errors.conflict')
    expect(mapConfirmErrorKey({ response: { status: 400 } })).toBe('admin.confirm.errors.badRequest')
    expect(mapConfirmErrorKey(new Error('Unknown failure'))).toBe('admin.confirm.errors.generic')
    expect(mapConfirmErrorKey(null)).toBe('admin.confirm.errors.generic')
  })
})
