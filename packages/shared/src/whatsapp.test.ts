import { describe, it, expect } from 'vitest'
import {
  waLink,
  renderTemplate,
  DEFAULT_TEMPLATES,
  statusTemplateKey,
  buildAdminOrderMessage,
  buildRestockMessage,
} from './whatsapp.js'

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

describe('buildAdminOrderMessage', () => {
  it('builds a formatted Arabic order message with customer, items, money and link', () => {
    const text = buildAdminOrderMessage({
      id: 'ord_123',
      no: 'SR-2026-000100',
      customerName: 'محمد أحمد',
      customerPhone: '01012345678',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address: 'شارع الجمهورية، برج النور',
      subtotal: 5000000,
      discount: 500000,
      deliveryFee: 15000,
      total: 4515000,
      paymentMethod: 'cod',
      notes: 'رن الجرس مرتين',
      items: [
        { name: 'ثلاجة شارب 18 قدم', qty: 1, unitPrice: 3500000, lineTotal: 3500000 },
        { name: 'غسالة ال جي 9 كيلو', qty: 1, unitPrice: 1500000, lineTotal: 1500000 },
      ],
      webOrigin: 'https://serag.eg',
    })

    expect(text).toContain('🛒 أوردر جديد #SR-2026-000100')
    expect(text).toContain('العميل: محمد أحمد')
    expect(text).toContain('الهاتف: 01012345678')
    expect(text).toContain('العنوان: الدقهلية - المنصورة - شارع الجمهورية، برج النور')
    expect(text).toContain('• ثلاجة شارب 18 قدم × 1 — 35,000 ج.م')
    expect(text).toContain('• غسالة ال جي 9 كيلو × 1 — 15,000 ج.م')
    expect(text).toContain('المجموع الفرعي: 50,000 ج.م')
    expect(text).toContain('الخصم: 5,000 ج.م')
    expect(text).toContain('مصاريف التوصيل: 150 ج.م')
    expect(text).toContain('الإجمالي: 45,150 ج.م')
    expect(text).toContain('طريقة الدفع: الدفع عند الاستلام')
    expect(text).toContain('ملاحظات: رن الجرس مرتين')
    expect(text).toContain('رابط الطلب: https://serag.eg/admin/orders/ord_123')
    expect(text.length).toBeLessThanOrEqual(900)
  })

  it('truncates very long item lists to stay under 900 characters with "و N أصناف أخرى"', () => {
    const manyItems = Array.from({ length: 30 }, (_, i) => ({
      name: `منتج تجريبي مواصفات تفصيلية طويلة جدا رقم ${i + 1}`,
      qty: 2,
      unitPrice: 100000,
      lineTotal: 200000,
    }))

    const text = buildAdminOrderMessage({
      id: 'ord_long',
      no: 'SR-2026-000999',
      customerName: 'عميل بطلب كبير',
      customerPhone: '01211112222',
      address: 'المنصورة، الدقهلية',
      subtotal: 6000000,
      discount: 0,
      deliveryFee: 5000,
      total: 6005000,
      paymentMethod: 'instapay',
      items: manyItems,
      webOrigin: 'https://serag.eg',
    })

    expect(text).toContain('🛒 أوردر جديد #SR-2026-000999')
    expect(text).toContain('أصناف أخرى')
    expect(text.length).toBeLessThanOrEqual(900)
  })
})

describe('buildRestockMessage', () => {
  it('builds restock message with product name and link', () => {
    const text = buildRestockMessage({
      productName: 'ثلاجة توشيبا 16 قدم',
      url: 'https://serag.eg/p/toshiba-16',
    })

    expect(text).toBe(
      '✅ ثلاجة توشيبا 16 قدم رجع متاح عندنا في معرض محمد سراج! اطلبه من هنا: https://serag.eg/p/toshiba-16 ',
    )
  })
})

