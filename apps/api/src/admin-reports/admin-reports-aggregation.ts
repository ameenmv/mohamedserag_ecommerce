import {
  PAYMENT_METHOD_LABELS,
  averageOrderValue,
  bucketKey,
  fillBuckets,
  orderTypeSchema,
  paymentMethodSchema,
  splitDiscount,
  type BestSellerRow,
  type DateRange,
  type OrderType,
  type ReportGrouping,
  type RevenueReport,
  type SplitRow,
  type SplitsReport,
} from '@serag/shared'

/** Label for rows whose category/brand is missing (deleted product or no brand). */
export const UNDEFINED_LABEL = 'غير محدد'
/** Pseudo id for the «رسوم التوصيل» row inside category/brand splits. */
export const DELIVERY_ROW_ID = 'delivery'
export const DELIVERY_ROW_LABEL = 'رسوم التوصيل'

/** Internal map key for lines whose category/brand id is missing (cannot collide with cuids). */
const UNSET_KEY = ' unset'

const ORDER_TYPE_SPLIT_LABELS: Record<OrderType, string> = {
  order: 'طلبات',
  bridal: 'حجوزات عرايس',
}

export interface RevenueDayRow {
  /** Cairo day key (`YYYY-MM-DD`) of the delivered date. */
  day: string
  revenue: number
  orders: number
}

/** Aggregates per-Cairo-day rows into dense `groupBy` buckets (R1, R3, FR-006). */
export function buildRevenueReport(
  days: readonly RevenueDayRow[],
  range: DateRange,
  groupBy: ReportGrouping,
): RevenueReport {
  const perBucket = new Map<string, { revenue: number; orders: number }>()
  for (const row of days) {
    const key = bucketKey(row.day, groupBy)
    const acc = perBucket.get(key)
    if (acc === undefined) {
      perBucket.set(key, { revenue: row.revenue, orders: row.orders })
    } else {
      acc.revenue += row.revenue
      acc.orders += row.orders
    }
  }

  const merged = Array.from(perBucket.entries()).map(([key, acc]) => ({ key, ...acc }))
  const buckets = fillBuckets(range, groupBy, merged, (key) => ({ key, revenue: 0, orders: 0 })).map(
    (bucket) => ({ ...bucket, aov: averageOrderValue(bucket.revenue, bucket.orders) }),
  )

  let revenue = 0
  let orders = 0
  for (const bucket of buckets) {
    revenue += bucket.revenue
    orders += bucket.orders
  }

  return {
    from: range.from,
    to: range.to,
    groupBy,
    buckets,
    totals: { revenue, orders, aov: averageOrderValue(revenue, orders) },
  }
}

export interface SplitOrderInput {
  id: string
  total: number
  discount: number
  deliveryFee: number
  paymentMethod: string
  zoneId: string
  type: string
}

export interface SplitLineInput {
  orderId: string
  /** Current category id of the line's product; `null` when the product is missing. */
  categoryId: string | null
  categoryName: string | null
  brandId: string | null
  brandName: string | null
  /** Line amount (`qty × unitPrice`) in piastres, before discount. */
  amount: number
}

function sortSplitRows(rows: SplitRow[]): SplitRow[] {
  return rows.sort(
    (a, b) => b.revenue - a.revenue || b.orders - a.orders || a.label.localeCompare(b.label),
  )
}

function groupWholeOrders(
  orders: readonly SplitOrderInput[],
  keyOf: (order: SplitOrderInput) => string,
  labelOf: (order: SplitOrderInput) => string,
): SplitRow[] {
  const rows = new Map<string, { label: string; revenue: number; orders: number }>()
  for (const order of orders) {
    const key = keyOf(order)
    const acc = rows.get(key)
    if (acc === undefined) {
      rows.set(key, { label: labelOf(order), revenue: order.total, orders: 1 })
    } else {
      acc.revenue += order.total
      acc.orders += 1
    }
  }
  return sortSplitRows(Array.from(rows.entries()).map(([id, acc]) => ({ id, ...acc })))
}

function keyedSplitRows(
  orders: readonly SplitOrderInput[],
  lines: readonly SplitLineInput[],
  keyOf: (line: SplitLineInput) => { id: string | null; name: string | null },
): SplitRow[] {
  const linesByOrder = new Map<string, SplitLineInput[]>()
  for (const line of lines) {
    const bucket = linesByOrder.get(line.orderId)
    if (bucket === undefined) {
      linesByOrder.set(line.orderId, [line])
    } else {
      bucket.push(line)
    }
  }

  const rows = new Map<string, { label: string; revenue: number; orderIds: Set<string> }>()
  const addRow = (id: string | null, label: string, revenue: number, orderId: string): void => {
    const key = id ?? UNSET_KEY
    const acc = rows.get(key)
    if (acc === undefined) {
      rows.set(key, { label, revenue, orderIds: new Set([orderId]) })
    } else {
      acc.revenue += revenue
      acc.orderIds.add(orderId)
    }
  }

  let deliveryFee = 0
  let deliveryOrders = 0

  for (const order of orders) {
    const orderLines = linesByOrder.get(order.id)
    if (orderLines !== undefined && orderLines.length > 0) {
      const amountByKey = new Map<string, number>()
      const metaByKey = new Map<string, { id: string | null; name: string | null }>()
      const shareLines: { key: string; amount: number }[] = []
      for (const line of orderLines) {
        const meta = keyOf(line)
        const key = meta.id ?? UNSET_KEY
        amountByKey.set(key, (amountByKey.get(key) ?? 0) + line.amount)
        metaByKey.set(key, meta)
        shareLines.push({ key, amount: line.amount })
      }

      // Proportional largest-remainder discount split per line (R4); each key's
      // accumulated share is subtracted once so rows sum exactly to revenue.
      const shares = splitDiscount(shareLines, order.discount)
      for (const [key, amount] of amountByKey) {
        const meta = metaByKey.get(key) ?? { id: null, name: null }
        addRow(meta.id, meta.name ?? UNDEFINED_LABEL, amount - (shares.get(key) ?? 0), order.id)
      }
    }

    if (order.deliveryFee > 0) deliveryOrders += 1
    deliveryFee += order.deliveryFee
  }

  const result: SplitRow[] = Array.from(rows.entries()).map(([key, acc]) => ({
    id: key === UNSET_KEY ? null : key,
    label: acc.label,
    revenue: acc.revenue,
    orders: acc.orderIds.size,
  }))
  result.push({
    id: DELIVERY_ROW_ID,
    label: DELIVERY_ROW_LABEL,
    revenue: deliveryFee,
    orders: deliveryOrders,
  })
  return sortSplitRows(result)
}

/**
 * Builds the five split views of the delivered set (FR-007, R4). Category/brand
 * rows include the «رسوم التوصيل» row so each of them sums exactly to the
 * revenue total; payment method, zone and type group whole orders by total.
 */
export function buildSplitsReport(
  range: DateRange,
  orders: readonly SplitOrderInput[],
  lines: readonly SplitLineInput[],
  zoneLabels: ReadonlyMap<string, string>,
): SplitsReport {
  return {
    from: range.from,
    to: range.to,
    byCategory: keyedSplitRows(orders, lines, (line) => ({
      id: line.categoryId,
      name: line.categoryName,
    })),
    byBrand: keyedSplitRows(orders, lines, (line) => ({
      id: line.brandId,
      name: line.brandName,
    })),
    byPaymentMethod: groupWholeOrders(
      orders,
      (order) => order.paymentMethod,
      (order) => {
        const parsed = paymentMethodSchema.safeParse(order.paymentMethod)
        return parsed.success ? PAYMENT_METHOD_LABELS[parsed.data] : order.paymentMethod
      },
    ),
    byZone: groupWholeOrders(
      orders,
      (order) => order.zoneId,
      (order) => zoneLabels.get(order.zoneId) ?? order.zoneId,
    ),
    byType: groupWholeOrders(
      orders,
      (order) => order.type,
      (order) => {
        const parsed = orderTypeSchema.safeParse(order.type)
        return parsed.success ? ORDER_TYPE_SPLIT_LABELS[parsed.data] : order.type
      },
    ),
  }
}

export interface BestSellerLineInput {
  productId: string | null
  qty: number
  unitPrice: number
  /** Order-line name used when the product row is missing. */
  name: string
  modelCode: string
  /** Current product snapshot; `null` when the product row is missing. */
  product: { name: string; modelCode: string; stock: number } | null
}

/** Ranks delivered lines by units (tie → revenue), top `limit` (FR-008). */
export function buildBestSellerRows(
  lines: readonly BestSellerLineInput[],
  limit = 50,
): BestSellerRow[] {
  const byProduct = new Map<string, BestSellerRow>()
  for (const line of lines) {
    if (line.productId === null) continue
    const revenue = line.qty * line.unitPrice
    const acc = byProduct.get(line.productId)
    if (acc === undefined) {
      byProduct.set(line.productId, {
        productId: line.productId,
        name: line.product?.name ?? line.name,
        modelCode: line.product?.modelCode ?? line.modelCode,
        units: line.qty,
        revenue,
        stock: line.product?.stock ?? 0,
      })
    } else {
      acc.units += line.qty
      acc.revenue += revenue
    }
  }
  return Array.from(byProduct.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, limit)
}
