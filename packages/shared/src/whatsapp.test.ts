import { describe, it, expect } from 'vitest'
import { waLink, renderTemplate, DEFAULT_TEMPLATES, statusTemplateKey } from './whatsapp.js'

describe('waLink', () => {
  it('builds a wa.me link from local Egyptian mobile or international 201... format', () => {
    expect(waLink('01012345678', 'مرحباً')).toBe(
      `https://wa.me/201012345678?text=${encodeURIComponent('مرحباً')}`,
    )
    expect(waLink('+20 10 1234 5678', 'طلب رقم 101')).toBe(
      `https://wa.me/201012345678?text=${encodeURIComponent('طلب رقم 101')}`,
    )
    expect(waLink('201000000000', 'استفسار')).toBe(
      `https://wa.me/201000000000?text=${encodeURIComponent('استفسار')}`,
    )
  })
})

describe('renderTemplate & DEFAULT_TEMPLATES', () => {
  it('replaces known variables and leaves unknown variables untouched', () => {
    const rendered = renderTemplate('أهلاً {{customerName}} طلب {{orderNo}} {{unknownVar}}', {
      customerName: 'سارة',
      orderNo: 105,
    })
    expect(rendered).toBe('أهلاً سارة طلب 105 {{unknownVar}}')
  })

  it('includes all required Egyptian Arabic templates and renders payment_proof and bridal_locked', () => {
    expect(Object.keys(DEFAULT_TEMPLATES)).toEqual([
      'order_confirmed',
      'order_out_for_delivery',
      'order_delivered',
      'order_cancelled',
      'payment_rejected',
      'payment_proof',
      'bridal_locked',
      'bridal_repriced',
      'notify_back_in_stock',
      'product_question',
      'traders_contact',
    ])

    const cancelled = renderTemplate(DEFAULT_TEMPLATES.order_cancelled, {
      customerName: 'أحمد',
      orderNo: 'SR-2026-000100',
    })
    expect(cancelled).toContain('أحمد')
    expect(cancelled).toContain('SR-2026-000100')
    expect(cancelled).toContain('تم إلغاء طلبك')

    const proof = renderTemplate(DEFAULT_TEMPLATES.payment_proof, {
      orderNo: 'SR-2026-01',
      amount: '28,900 ج.م',
      method: 'إنستا باي',
      confirmUrl: 'https://serag.eg/admin/confirm/tok123',
    })
    expect(proof).toContain('SR-2026-01')
    expect(proof).toContain('28,900 ج.م')
    expect(proof).toContain('إنستا باي')
    expect(proof).toContain('https://serag.eg/admin/confirm/tok123')

    const bridal = renderTemplate(DEFAULT_TEMPLATES.bridal_locked, {
      customerName: 'نور',
      orderNo: 'BR-10',
      lockedUntil: '2026-11-15',
    })
    expect(bridal).toContain('2026-11-15')

    const repriced = renderTemplate(DEFAULT_TEMPLATES.bridal_repriced, {
      customerName: 'سلمى',
      orderNo: 'BR-12',
      oldTotal: '150,000 ج.م',
      newTotal: '155,000 ج.م',
      lockedUntil: '2026-12-01',
    })
    expect(repriced).toContain('سلمى')
    expect(repriced).toContain('BR-12')
    expect(repriced).toContain('150,000 ج.م')
    expect(repriced).toContain('155,000 ج.م')
    expect(repriced).toContain('2026-12-01')
  })
})

describe('statusTemplateKey', () => {
  it('maps order statuses to appropriate template keys', () => {
    expect(statusTemplateKey('confirmed')).toBe('order_confirmed')
    expect(statusTemplateKey('out_for_delivery')).toBe('order_out_for_delivery')
    expect(statusTemplateKey('delivered')).toBe('order_delivered')
    expect(statusTemplateKey('payment_rejected')).toBe('payment_rejected')
    expect(statusTemplateKey('cancelled')).toBe('order_cancelled')
    expect(statusTemplateKey('new')).toBeNull()
    expect(statusTemplateKey('awaiting_payment')).toBeNull()
    expect(statusTemplateKey('awaiting_deposit')).toBeNull()
  })
})

