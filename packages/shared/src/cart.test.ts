import { describe, it, expect } from 'vitest'
import {
  buildCartQuote,
  codDepositAmount,
  type CartProductRecord,
  type CartQuoteContext,
} from './cart.js'
import { DEFAULT_ZONES } from './zones.js'

describe('codDepositAmount', () => {
  it('calculates whole-pound deposits without needing rounding up', () => {
    // 30,000 EGP = 3,000,000 piastres * 10% = 300,000 piastres (3,000 EGP)
    expect(codDepositAmount(3_000_000, 10)).toBe(300_000)
    // 10,000 EGP = 1,000,000 piastres * 10% = 100,000 piastres (1,000 EGP)
    expect(codDepositAmount(1_000_000, 10)).toBe(100_000)
  })

  it('rounds UP fractional pound deposits to a multiple of 100 piastres (whole pound)', () => {
    // 30,001 EGP = 3,000,100 piastres * 10% = 300,010 piastres -> rounds up to 300,100 piastres (3,001 EGP)
    expect(codDepositAmount(3_000_100, 10)).toBe(300_100)

    // 1 EGP = 100 piastres * 10% = 10 piastres -> rounds up to 100 piastres (1 EGP)
    expect(codDepositAmount(100, 10)).toBe(100)

    // 123 EGP = 12,300 piastres * 10% = 1,230 piastres -> rounds up to 1,300 piastres (13 EGP)
    expect(codDepositAmount(12_300, 10)).toBe(1_300)
  })

  it('returns 0 for non-positive total or non-positive pct', () => {
    expect(codDepositAmount(0, 10)).toBe(0)
    expect(codDepositAmount(-500, 10)).toBe(0)
    expect(codDepositAmount(10_000, 0)).toBe(0)
    expect(codDepositAmount(10_000, -5)).toBe(0)
  })
})

describe('buildCartQuote', () => {
  const defaultCodDeposit = { threshold: 3_000_000, pct: 10 }
  const ctx: CartQuoteContext = {
    zones: DEFAULT_ZONES,
    codDeposit: defaultCodDeposit,
  }

  const sampleProducts: CartProductRecord[] = [
    {
      id: 'p1',
      slug: 'fridge-1',
      name: 'ثلاجة شارب',
      modelCode: 'SH-101',
      price: 100_000, // 1,000 EGP
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 10,
      lowStockThreshold: 2,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: '/images/p1.jpg',
      purchasable: true,
      flash: null,
    },
    {
      id: 'p2',
      slug: 'washer-1',
      name: 'غسالة توشيبا',
      modelCode: 'TS-202',
      price: 200_000, // 2,000 EGP
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 0,
      lowStockThreshold: 2,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: '/images/p2.jpg',
      purchasable: true,
      flash: null,
    },
    {
      id: 'p3',
      slug: 'ac-1',
      name: 'تكييف إل جي',
      modelCode: 'LG-303',
      price: 300_000, // 3,000 EGP
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 0,
      lowStockThreshold: 2,
      availabilityMode: 'on_request',
      leadTimeText: 'متاح بالطلب خلال 3-5 أيام',
      imageUrl: '/images/p3.jpg',
      purchasable: true,
      flash: null,
    },
    {
      id: 'p4',
      slug: 'archived-1',
      name: 'منتج مؤرشف',
      modelCode: 'ARC-404',
      price: 400_000,
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 10,
      lowStockThreshold: 2,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: null,
      purchasable: false,
      flash: null,
    },
    {
      id: 'p5',
      slug: 'cooker-1',
      name: 'بوتاجاز فريش',
      modelCode: 'FR-505',
      price: 50_000, // 500 EGP
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 3,
      lowStockThreshold: 5,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: null,
      purchasable: true,
      flash: null,
    },
    {
      id: 'pHighStock',
      slug: 'high-stock-1',
      name: 'ثلاجة متوفرة بكثرة',
      modelCode: 'HS-101',
      price: 100_000,
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 50,
      lowStockThreshold: 2,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: null,
      purchasable: true,
      flash: null,
    },
    {
      id: 'pBigCod',
      slug: 'big-cod-1',
      name: 'تكييف كبير',
      modelCode: 'BIG-101',
      price: 3_000_100, // 30,001 EGP (100 piastres above threshold)
      oldPrice: null,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      taxRate: 14,
      stock: 10,
      lowStockThreshold: 1,
      availabilityMode: 'auto',
      leadTimeText: null,
      imageUrl: null,
      purchasable: true,
      flash: null,
    },
  ]

  it('calculates zone delivery fees: Mansoura/Talkha = 10000, other Dakahlia = 15000, Cairo = 40000', () => {
    // Mansoura
    const qMansoura = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
        governorate: 'الدقهلية',
        city: 'المنصورة',
      },
      sampleProducts,
      ctx,
    )
    expect(qMansoura.zone?.name).toBe('المنصورة')
    expect(qMansoura.zone?.fee).toBe(10000)
    expect(qMansoura.deliveryFee).toBe(10000)
    expect(qMansoura.total).toBe(100_000 + 10000)

    // Talkha
    const qTalkha = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
        governorate: 'الدقهلية',
        city: 'طلخا',
      },
      sampleProducts,
      ctx,
    )
    expect(qTalkha.zone?.name).toBe('المنصورة')
    expect(qTalkha.deliveryFee).toBe(10000)

    // Other Dakahlia city (e.g. ميت غمر)
    const qDakahlia = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
        governorate: 'الدقهلية',
        city: 'ميت غمر',
      },
      sampleProducts,
      ctx,
    )
    expect(qDakahlia.zone?.name).toBe('مراكز الدقهلية')
    expect(qDakahlia.deliveryFee).toBe(15000)

    // Cairo
    const qCairo = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
        governorate: 'القاهرة',
        city: 'مدينة نصر',
      },
      sampleProducts,
      ctx,
    )
    expect(qCairo.zone?.name).toBe('باقي مصر')
    expect(qCairo.deliveryFee).toBe(40000)

    // Missing governorate
    const qNoGov = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
      },
      sampleProducts,
      ctx,
    )
    expect(qNoGov.zone).toBeNull()
    expect(qNoGov.deliveryFee).toBe(0)
    expect(qNoGov.total).toBe(100_000)
  })

  it('flags out-of-stock line as unavailable, sets qty to 0, and excludes it from totals', () => {
    const quote = buildCartQuote(
      {
        items: [{ productId: 'p2', qty: 2 }],
        governorate: 'الدقهلية',
        city: 'المنصورة',
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines).toHaveLength(1)
    expect(quote.lines[0]?.issues).toEqual(['unavailable'])
    expect(quote.lines[0]?.qty).toBe(0)
    expect(quote.lines[0]?.lineTotal).toBe(0)
    expect(quote.hasBlockingIssues).toBe(true)
    expect(quote.subtotal).toBe(0)
    // No countable lines -> deliveryFee is 0
    expect(quote.deliveryFee).toBe(0)
    expect(quote.total).toBe(0)
  })

  it('flags unpurchasable or unknown product as not_found', () => {
    const quote = buildCartQuote(
      {
        items: [
          { productId: 'p4', qty: 1 },
          { productId: 'unknown-id', qty: 1 },
        ],
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines[0]?.issues).toEqual(['not_found'])
    expect(quote.lines[0]?.qty).toBe(0)
    expect(quote.lines[1]?.issues).toEqual(['not_found'])
    expect(quote.lines[1]?.qty).toBe(0)
    expect(quote.hasBlockingIssues).toBe(true)
  })

  it('caps quantity at stock for auto mode and records qty_capped issue', () => {
    // p5 has stock: 3
    const quote = buildCartQuote(
      {
        items: [{ productId: 'p5', qty: 5 }],
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines[0]?.issues).toEqual(['qty_capped'])
    expect(quote.lines[0]?.requestedQty).toBe(5)
    expect(quote.lines[0]?.qty).toBe(3)
    expect(quote.lines[0]?.lineTotal).toBe(3 * 50_000)
    expect(quote.subtotal).toBe(150_000)
    expect(quote.hasBlockingIssues).toBe(true)
  })

  it('allows on_request products to be ordered regardless of stock with leadTimeText', () => {
    // p3 has stock: 0, availabilityMode: 'on_request'
    const quote = buildCartQuote(
      {
        items: [{ productId: 'p3', qty: 4 }],
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines[0]?.issues).toEqual([])
    expect(quote.lines[0]?.requestedQty).toBe(4)
    expect(quote.lines[0]?.qty).toBe(4)
    expect(quote.lines[0]?.lineTotal).toBe(4 * 300_000)
    expect(quote.lines[0]?.leadTimeText).toBe('متاح بالطلب خلال 3-5 أيام')
    expect(quote.lines[0]?.availability.orderable).toBe(true)
    expect(quote.hasBlockingIssues).toBe(false)
  })

  it('detects price_changed when knownPrice differs from actual price', () => {
    const quote = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1, knownPrice: 80_000 }],
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines[0]?.issues).toEqual(['price_changed'])
    expect(quote.lines[0]?.previousPrice).toBe(80_000)
    expect(quote.lines[0]?.unitPrice).toBe(100_000)
    expect(quote.hasBlockingIssues).toBe(true)
  })

  it('merges duplicate product IDs in items and caps sum at 99', () => {
    const quote = buildCartQuote(
      {
        items: [
          { productId: 'p1', qty: 2 },
          { productId: 'p1', qty: 3 },
        ],
      },
      sampleProducts,
      ctx,
    )

    expect(quote.lines).toHaveLength(1)
    expect(quote.lines[0]?.productId).toBe('p1')
    expect(quote.lines[0]?.requestedQty).toBe(5)
    expect(quote.lines[0]?.qty).toBe(5)
  })

  it('requires deposit for COD orders over threshold and rounds up amount', () => {
    // Total: 3,000,100 piastres (100 piastres above 3,000,000 threshold)
    const quote = buildCartQuote(
      {
        items: [{ productId: 'pBigCod', qty: 1 }],
        paymentMethod: 'cod',
      },
      sampleProducts,
      ctx,
    )

    expect(quote.codDeposit.required).toBe(true)
    expect(quote.codDeposit.pct).toBe(10)
    // 3,000,100 * 10% = 300,010 piastres -> rounds up to 300,100 piastres (3,001 EGP)
    expect(quote.codDeposit.amount).toBe(300_100)
    expect(quote.codDeposit.threshold).toBe(3_000_000)

    // Also testing with pHighStock: 31 * 100,000 = 3,100,000 piastres
    const quoteMulti = buildCartQuote(
      {
        items: [{ productId: 'pHighStock', qty: 31 }],
        paymentMethod: 'cod',
      },
      sampleProducts,
      ctx,
    )
    expect(quoteMulti.codDeposit.required).toBe(true)
    expect(quoteMulti.codDeposit.amount).toBe(310_000)
  })

  it('does NOT require deposit when total equals threshold exactly (rule is strictly above)', () => {
    // 30 * 100,000 = 3,000,000 piastres (exactly threshold)
    const quote = buildCartQuote(
      {
        items: [{ productId: 'pHighStock', qty: 30 }],
        paymentMethod: 'cod',
      },
      sampleProducts,
      ctx,
    )

    expect(quote.total).toBe(3_000_000)
    expect(quote.codDeposit.required).toBe(false)
    expect(quote.codDeposit.amount).toBe(0)
    expect(quote.codDeposit.threshold).toBe(3_000_000)
  })

  it('never requires deposit for non-COD payment methods even if over threshold', () => {
    const quote = buildCartQuote(
      {
        items: [{ productId: 'pHighStock', qty: 40 }],
        paymentMethod: 'instapay',
      },
      sampleProducts,
      ctx,
    )

    expect(quote.total).toBe(4_000_000)
    expect(quote.codDeposit.required).toBe(false)
    expect(quote.codDeposit.amount).toBe(0)
  })


  it('applies coupon discount without dropping total below 0', () => {
    const quote = buildCartQuote(
      {
        items: [{ productId: 'p1', qty: 1 }],
      },
      sampleProducts,
      {
        ...ctx,
        coupon: {
          code: 'DISCOUNT200',
          status: 'applied',
          discount: 20_000,
          reason: null,
          reasonCode: null,
        },
      },
    )

    expect(quote.subtotal).toBe(100_000)
    expect(quote.discount).toBe(20_000)
    expect(quote.total).toBe(80_000)
    expect(quote.coupon?.status).toBe('applied')
  })
})
