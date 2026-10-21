import { describe, it, expect } from 'vitest'
import { createOrderInputSchema } from './order-schema.js'
import {
  zonesSchema,
  codDepositSchema,
  paymentsSettingSchema,
  DEFAULT_COD_DEPOSIT,
  DEFAULT_PAYMENTS,
} from './settings-schema.js'
import { DEFAULT_ZONES } from './zones.js'

describe('createOrderInputSchema', () => {
  const validOrderInput = {
    items: [{ productId: 'p1', qty: 2 }],
    customer: {
      name: 'محمد أحمد سراج',
      phone: '٠١٠ ١٢٣٤ ٥٦٧٨',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address: 'شارع الجمهورية أمام بنك مصر',
      notes: 'برجاء الاتصال قبل التوصيل',
    },
    paymentMethod: 'cod',
    idempotencyKey: 'valid_idempotency_key_123456789',
    expectedTotal: 200_000,
  }

  it('normalizes phone number from Arabic-Indic digits with spaces', () => {
    const res = createOrderInputSchema.safeParse(validOrderInput)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.customer.phone).toBe('01012345678')
    }
  })

  it('rejects invalid phone numbers', () => {
    const res = createOrderInputSchema.safeParse({
      ...validOrderInput,
      customer: {
        ...validOrderInput.customer,
        phone: '0131234567',
      },
    })
    expect(res.success).toBe(false)
  })

  it('rejects bad idempotency keys (too short, too long, invalid characters)', () => {
    // Too short (< 16 chars)
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        idempotencyKey: 'short_key',
      }).success,
    ).toBe(false)

    // Invalid character (space, $, @, etc.)
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        idempotencyKey: 'invalid key with spaces!!',
      }).success,
    ).toBe(false)

    // Too long (> 64 chars)
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        idempotencyKey: 'a'.repeat(65),
      }).success,
    ).toBe(false)

    // Valid 16-64 chars
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        idempotencyKey: 'a'.repeat(16),
      }).success,
    ).toBe(true)
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        idempotencyKey: 'a'.repeat(64),
      }).success,
    ).toBe(true)
  })

  it('rejects short customer name or short address', () => {
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        customer: {
          ...validOrderInput.customer,
          name: 'أ',
        },
      }).success,
    ).toBe(false)

    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        customer: {
          ...validOrderInput.customer,
          address: 'شارع',
        },
      }).success,
    ).toBe(false)
  })

  it('rejects negative or fractional expectedTotal', () => {
    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        expectedTotal: -100,
      }).success,
    ).toBe(false)

    expect(
      createOrderInputSchema.safeParse({
        ...validOrderInput,
        expectedTotal: 100.5,
      }).success,
    ).toBe(false)
  })

  it('merges duplicate items in order payload', () => {
    const res = createOrderInputSchema.safeParse({
      ...validOrderInput,
      items: [
        { productId: 'p1', qty: 2 },
        { productId: 'p1', qty: 3 },
      ],
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.items).toHaveLength(1)
      expect(res.data.items[0]?.productId).toBe('p1')
      expect(res.data.items[0]?.qty).toBe(5)
    }
  })
})

describe('settings-schema', () => {
  it('validates default zones and default codDeposit', () => {
    expect(zonesSchema.safeParse(DEFAULT_ZONES).success).toBe(true)
    expect(codDepositSchema.safeParse(DEFAULT_COD_DEPOSIT).success).toBe(true)
  })

  it('validates default payments setting', () => {
    expect(paymentsSettingSchema.safeParse(DEFAULT_PAYMENTS).success).toBe(true)
  })

  it('rejects invalid payments setting schema', () => {
    expect(
      paymentsSettingSchema.safeParse({
        methods: {
          invalid_method: { enabled: true, name: 'طريقة' },
        },
      }).success,
    ).toBe(false)
  })
})
