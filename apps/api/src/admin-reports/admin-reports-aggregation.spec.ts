import { describe, expect, it } from 'vitest'
import type { DateRange } from '@serag/shared'
import {
  buildBestSellerRows,
  buildRevenueReport,
  buildSplitsReport,
  DELIVERY_ROW_ID,
  DELIVERY_ROW_LABEL,
  UNDEFINED_LABEL,
  type BestSellerLineInput,
  type SplitLineInput,
  type SplitOrderInput,
} from './admin-reports-aggregation.js'

const range: DateRange = { from: '2020-03-01', to: '2020-03-07' }

function sumRevenue(rows: { revenue: number }[]): number {
  return rows.reduce((acc, row) => acc + row.revenue, 0)
}

describe('buildRevenueReport', () => {
  it('fills empty days with zero revenue and computes AOV per bucket', () => {
    const report = buildRevenueReport(
      [
        { day: '2020-03-01', revenue: 100_00, orders: 1 },
        { day: '2020-03-01', revenue: 50_00, orders: 1 },
        { day: '2020-03-03', revenue: 200_00, orders: 4 },
      ],
      range,
      'day',
    )

    expect(report.buckets).toHaveLength(7)
    expect(report.buckets[0]).toMatchObject({ key: '2020-03-01', revenue: 150_00, orders: 2 })
    expect(report.buckets[0]?.aov).toBe(75_00)
    expect(report.buckets[1]).toMatchObject({ key: '2020-03-02', revenue: 0, orders: 0, aov: 0 })
    expect(report.totals).toEqual({
      revenue: 350_00,
      orders: 6,
      aov: Math.round(350_00 / 6),
    })
  })

  it('merges day rows into week buckets when grouping by week', () => {
    const report = buildRevenueReport(
      [
        { day: '2020-03-01', revenue: 100_00, orders: 1 },
        { day: '2020-03-05', revenue: 250_00, orders: 2 },
      ],
      range,
      'week',
    )

    // Week starts Saturday: 2020-03-01 (Sunday) .. 2020-03-05 (Thursday) share the week of
    // Saturday 2020-02-29; the range's last day 2020-03-07 opens an empty second week.
    expect(report.buckets).toHaveLength(2)
    expect(report.buckets[0]).toMatchObject({ key: '2020-02-29', revenue: 350_00, orders: 3 })
    expect(report.buckets[1]).toMatchObject({ key: '2020-03-07', revenue: 0, orders: 0 })
  })

  it('returns zeroed totals for an empty range', () => {
    const report = buildRevenueReport([], range, 'day')
    expect(report.totals).toEqual({ revenue: 0, orders: 0, aov: 0 })
    expect(report.buckets.every((bucket) => bucket.revenue === 0)).toBe(true)
  })
})

describe('buildSplitsReport', () => {
  const order1: SplitOrderInput = {
    id: 'o1',
    total: 250_00,
    discount: 10_00,
    deliveryFee: 10_00,
    paymentMethod: 'cod',
    zoneId: 'zone-mans',
    type: 'order',
  }
  const order2: SplitOrderInput = {
    id: 'o2',
    total: 160_00,
    discount: 0,
    deliveryFee: 10_00,
    paymentMethod: 'instapay',
    zoneId: 'zone-dkhl',
    type: 'order',
  }
  const lines: SplitLineInput[] = [
    {
      orderId: 'o1',
      categoryId: 'catA',
      categoryName: 'أجهزة كهربائية',
      brandId: 'brandA',
      brandName: 'براند أ',
      amount: 200_00,
    },
    {
      orderId: 'o1',
      categoryId: 'catB',
      categoryName: 'تحت البيت',
      brandId: null,
      brandName: null,
      amount: 50_00,
    },
    {
      orderId: 'o2',
      categoryId: 'catA',
      categoryName: 'أجهزة كهربائية',
      brandId: 'brandB',
      brandName: 'براند ب',
      amount: 150_00,
    },
  ]
  const zones = new Map([
    ['zone-mans', 'المنصورة'],
    ['zone-dkhl', 'مراكز الدقهلية'],
  ])

  it('category and brand splits include the delivery row and sum exactly to revenue', () => {
    const report = buildSplitsReport(range, [order1, order2], lines, zones)
    const revenue = order1.total + order2.total

    expect(sumRevenue(report.byCategory)).toBe(revenue)
    expect(sumRevenue(report.byBrand)).toBe(revenue)

    const delivery = report.byCategory.find((row) => row.id === DELIVERY_ROW_ID)
    expect(delivery).toMatchObject({ label: DELIVERY_ROW_LABEL, revenue: 20_00, orders: 2 })
  })

  it('splits each order discount proportionally once per key', () => {
    const report = buildSplitsReport(range, [order1, order2], lines, zones)

    // o1: 200/250 and 50/250 of 10_00 discount → 8_00 and 2_00
    const catA = report.byCategory.find((row) => row.id === 'catA')
    expect(catA?.revenue).toBe(200_00 - 8_00 + 150_00)
    const catB = report.byCategory.find((row) => row.id === 'catB')
    expect(catB?.revenue).toBe(50_00 - 2_00)
  })

  it('labels unknown category ids as غير محدد', () => {
    const orphan: SplitLineInput[] = [
      {
        orderId: 'o2',
        categoryId: null,
        categoryName: null,
        brandId: null,
        brandName: null,
        amount: 150_00,
      },
    ]
    const orphanLines = [...lines.filter((line) => line.orderId === 'o1'), ...orphan]
    const report = buildSplitsReport(range, [order1, order2], orphanLines, zones)

    const unknown = report.byCategory.find((row) => row.id === null)
    expect(unknown?.label).toBe(UNDEFINED_LABEL)
    expect(unknown?.revenue).toBe(150_00)
  })

  it('groups whole orders by payment method, zone and type with Arabic labels', () => {
    const report = buildSplitsReport(range, [order1, order2], lines, zones)

    expect(report.byPaymentMethod).toEqual([
      { id: 'cod', label: 'الدفع عند الاستلام', revenue: 250_00, orders: 1 },
      { id: 'instapay', label: 'إنستا باي', revenue: 160_00, orders: 1 },
    ])
    expect(report.byZone.map((row) => row.label).sort()).toEqual([
      'المنصورة',
      'مراكز الدقهلية',
    ])
    expect(report.byType).toEqual([
      { id: 'order', label: 'طلبات', revenue: 250_00 + 160_00, orders: 2 },
    ])
  })

  it('labels bridal type rows as حجوزات عرايس', () => {
    const bridal: SplitOrderInput = { ...order2, id: 'o3', type: 'bridal' }
    const report = buildSplitsReport(range, [bridal], [], zones)
    expect(report.byType[0]).toMatchObject({ label: 'حجوزات عرايس', orders: 1 })
  })

  it('falls back to the raw zone id when the zone is unknown', () => {
    const report = buildSplitsReport(
      range,
      [{ ...order1, zoneId: 'zone-unknown' }],
      [],
      zones,
    )
    expect(report.byZone[0]?.label).toBe('zone-unknown')
  })
})

describe('buildBestSellerRows', () => {
  const lines: BestSellerLineInput[] = [
    {
      productId: 'pB',
      qty: 4,
      unitPrice: 50_00,
      name: 'قلاية قديمة',
      modelCode: 'OLD-1',
      product: { name: 'قلاية', modelCode: 'CL-1', stock: 7 },
    },
    {
      productId: 'pA',
      qty: 1,
      unitPrice: 100_00,
      name: 'غسالة',
      modelCode: 'WM-1',
      product: { name: 'غسالة', modelCode: 'WM-1', stock: 3 },
    },
    {
      productId: 'pA',
      qty: 1,
      unitPrice: 100_00,
      name: 'غسالة',
      modelCode: 'WM-1',
      product: { name: 'غسالة', modelCode: 'WM-1', stock: 3 },
    },
    {
      productId: 'pFlash',
      qty: 2,
      unitPrice: 60_00,
      name: 'فلاش',
      modelCode: 'FL-1',
      product: { name: 'فلاش', modelCode: 'FL-1', stock: 0 },
    },
  ]

  it('aggregates per product, sorts by units then revenue, and uses current snapshot', () => {
    const rows = buildBestSellerRows(lines)
    expect(rows.map((row) => row.productId)).toEqual(['pB', 'pA', 'pFlash'])
    expect(rows[1]).toMatchObject({ units: 2, revenue: 200_00, name: 'غسالة', stock: 3 })
  })

  it('falls back to the order-line snapshot when the product row is missing', () => {
    const rows = buildBestSellerRows([
      {
        productId: 'pX',
        qty: 1,
        unitPrice: 10_00,
        name: 'منتج محذوف',
        modelCode: 'DEL-1',
        product: null,
      },
    ])
    expect(rows[0]).toMatchObject({ name: 'منتج محذوف', modelCode: 'DEL-1', stock: 0 })
  })

  it('skips deleted-product lines and respects the limit', () => {
    const rows = buildBestSellerRows(
      [
        ...lines,
        {
          productId: null,
          qty: 9,
          unitPrice: 1_00,
          name: 'محذوف',
          modelCode: 'X',
          product: null,
        },
      ],
      2,
    )
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.productId !== null)).toBe(true)
  })
})
