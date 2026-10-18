import { describe, expect, it } from 'vitest'
import {
  adminOrderListQuerySchema,
  orderNotesSchema,
  whatsappLogSchema,
} from './order-admin-schema.js'

describe('adminOrderListQuerySchema', () => {
  it('applies default page and pageSize', () => {
    const res = adminOrderListQuerySchema.parse({})
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(20)
    expect(res.status).toBeUndefined()
    expect(res.paymentMethod).toBeUndefined()
  })

  it('accepts valid status and paymentMethod filters', () => {
    const res = adminOrderListQuerySchema.parse({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      page: '2',
      pageSize: '50',
    })
    expect(res.status).toBe('awaiting_payment')
    expect(res.paymentMethod).toBe('instapay')
    expect(res.page).toBe(2)
    expect(res.pageSize).toBe(50)
  })

  it('accepts valid ISO date bounds (YYYY-MM-DD)', () => {
    const res = adminOrderListQuerySchema.parse({
      from: '2026-10-01',
      to: '2026-10-18',
    })
    expect(res.from).toBe('2026-10-01')
    expect(res.to).toBe('2026-10-18')
  })

  it('rejects invalid date formats', () => {
    expect(() => adminOrderListQuerySchema.parse({ from: '01-10-2026' })).toThrow()
    expect(() => adminOrderListQuerySchema.parse({ to: '2026/10/18' })).toThrow()
    expect(() => adminOrderListQuerySchema.parse({ from: 'invalid' })).toThrow()
  })

  it('trims and bounds query string q', () => {
    const res = adminOrderListQuerySchema.parse({ q: '   SR-2026   ' })
    expect(res.q).toBe('SR-2026')

    expect(() => adminOrderListQuerySchema.parse({ q: 'a'.repeat(61) })).toThrow()
  })

  it('enforces page >= 1 and 1 <= pageSize <= 100', () => {
    expect(() => adminOrderListQuerySchema.parse({ page: 0 })).toThrow()
    expect(() => adminOrderListQuerySchema.parse({ pageSize: 0 })).toThrow()
    expect(() => adminOrderListQuerySchema.parse({ pageSize: 101 })).toThrow()
  })
})

describe('orderNotesSchema', () => {
  it('accepts internalNotes up to 2000 characters and trims whitespace', () => {
    const res = orderNotesSchema.parse({
      internalNotes: '  عميل VIP، يرجى التوصيل خلال الفترة الصباحية  ',
    })
    expect(res.internalNotes).toBe('عميل VIP، يرجى التوصيل خلال الفترة الصباحية')
  })

  it('accepts empty internalNotes', () => {
    const res = orderNotesSchema.parse({ internalNotes: '   ' })
    expect(res.internalNotes).toBe('')
  })

  it('rejects internalNotes longer than 2000 characters', () => {
    expect(() => orderNotesSchema.parse({ internalNotes: 'x'.repeat(2001) })).toThrow()
  })
})

describe('whatsappLogSchema', () => {
  it('accepts valid templateKey, normalized Egyptian mobile phone, and variables', () => {
    const res = whatsappLogSchema.parse({
      templateKey: 'order_confirmed',
      to: '01012345678',
      variables: {
        customerName: 'محمود',
        orderNo: 'SR-2026-000101',
        total: '1,500 ج.م',
      },
    })
    expect(res.templateKey).toBe('order_confirmed')
    expect(res.to).toBe('01012345678')
    expect(res.variables.customerName).toBe('محمود')
  })

  it('normalizes Arabic-Indic phone digits', () => {
    const res = whatsappLogSchema.parse({
      templateKey: 'order_out_for_delivery',
      to: '٠١٠١٢٣٤٥٦٧٨',
      variables: { customerName: 'أحمد' },
    })
    expect(res.to).toBe('01012345678')
  })

  it('rejects invalid templateKey or invalid phone', () => {
    expect(() =>
      whatsappLogSchema.parse({
        templateKey: 'non_existent_key',
        to: '01012345678',
        variables: {},
      }),
    ).toThrow()

    expect(() =>
      whatsappLogSchema.parse({
        templateKey: 'order_confirmed',
        to: '12345',
        variables: {},
      }),
    ).toThrow()
  })
})
