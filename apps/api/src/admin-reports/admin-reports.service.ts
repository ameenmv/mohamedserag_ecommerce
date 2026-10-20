import { Injectable } from '@nestjs/common'
import {
  percent,
  reportCsvRows,
  STORE_TIME_ZONE,
  type BestSellerRow,
  type BridalFunnelReport,
  type CouponReportRow,
  type DateRange,
  type FlashSaleReportRow,
  type RepeatCustomersReport,
  type ReportCsvInput,
  type ReportGrouping,
  type ReportKind,
  type RevenueReport,
  type SplitsReport,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { escapeCsvCell } from '../common/csv-cell.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import {
  buildBestSellerRows,
  buildRevenueReport,
  buildSplitsReport,
  type BestSellerLineInput,
  type SplitLineInput,
  type SplitOrderInput,
} from './admin-reports-aggregation.js'

interface RevenueSqlRow {
  day: string
  revenue: bigint | number
  delivered_orders: bigint | number
}

interface DeliveredOrderSqlRow {
  id: string
  total: bigint | number
  discount: bigint | number
  delivery_fee: bigint | number
  payment_method: string
  zone_id: string
  type: string
}

interface CountSqlRow {
  count: bigint | number
}

interface CouponSqlRow {
  coupon_id: string
  code: string
  use_count: bigint | number
  discount: bigint | number
  revenue: bigint | number
}

interface FlashSaleSqlRow {
  flash_sale_id: string
  name: string
  starts_at: string
  ends_at: string
  units: bigint | number
  revenue: bigint | number
  discount: bigint | number
}

interface RepeatCustomersSqlRow {
  customers: bigint | number
  repeat_customers: bigint | number
  period_customers: bigint | number
  period_repeat: bigint | number
}

interface OrderLineRow {
  orderId: string
  productId: string | null
  qty: number
  unitPrice: number
  name: string
  modelCode: string
  product: {
    categoryId: string
    brandId: string
    name: string
    modelCode: string
    stock: number
    category: { name: string }
    brand: { name: string }
  } | null
}

function toNumber(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value
}

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: StoreSettingsService,
  ) {}

  /** Revenue, delivered orders and AOV per `groupBy` bucket, dated by the delivered event (R1). */
  async revenue(range: DateRange, groupBy: ReportGrouping): Promise<RevenueReport> {
    const rows = await this.prisma.$queryRaw<RevenueSqlRow[]>(Prisma.sql`
      WITH delivered AS (
        SELECT
          o.id,
          o.total,
          COALESCE(
            (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
            o.updated_at
          ) AS delivered_at
        FROM orders o
        WHERE o.status = 'delivered'::"OrderStatus"
      )
      SELECT
        TO_CHAR((delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::bigint AS delivered_orders
      FROM delivered
      WHERE (delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
        BETWEEN ${range.from}::date AND ${range.to}::date
      GROUP BY day
    `)
    return buildRevenueReport(
      rows.map((row) => ({
        day: row.day,
        revenue: toNumber(row.revenue),
        orders: toNumber(row.delivered_orders),
      })),
      range,
      groupBy,
    )
  }

  /** Splits of the delivered set that sum exactly to the revenue total (FR-007, R4). */
  async splits(range: DateRange): Promise<SplitsReport> {
    const [orders, zones] = await Promise.all([
      this.fetchDeliveredOrders(range),
      this.settings.getZones(),
    ])
    const lines = await this.fetchOrderLines(orders.map((order) => order.id))
    const splitLines: SplitLineInput[] = lines.map((line) => ({
      orderId: line.orderId,
      categoryId: line.product?.categoryId ?? null,
      categoryName: line.product?.category.name ?? null,
      brandId: line.product?.brandId ?? null,
      brandName: line.product?.brand.name ?? null,
      amount: line.qty * line.unitPrice,
    }))
    const zoneLabels = new Map(zones.map((zone) => [zone.id, zone.name]))
    return buildSplitsReport(range, orders, splitLines, zoneLabels)
  }

  /** Top 50 products by units sold in the delivered set (FR-008). */
  async bestSellers(range: DateRange): Promise<{ items: BestSellerRow[] }> {
    const orders = await this.fetchDeliveredOrders(range)
    const lines = await this.fetchOrderLines(orders.map((order) => order.id))
    const bestSellerLines: BestSellerLineInput[] = lines.map((line) => ({
      productId: line.productId,
      qty: line.qty,
      unitPrice: line.unitPrice,
      name: line.name,
      modelCode: line.modelCode,
      product:
        line.product === null
          ? null
          : { name: line.product.name, modelCode: line.product.modelCode, stock: line.product.stock },
    }))
    return { items: buildBestSellerRows(bestSellerLines) }
  }

  /** Uses, discount and revenue per coupon on delivered orders (FR-009). */
  async coupons(range: DateRange): Promise<{ items: CouponReportRow[] }> {
    const rows = await this.prisma.$queryRaw<CouponSqlRow[]>(Prisma.sql`
      WITH delivered AS (
        SELECT
          o.id,
          o.total,
          o.discount,
          o.coupon_id,
          COALESCE(
            (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
            o.updated_at
          ) AS delivered_at
        FROM orders o
        WHERE o.status = 'delivered'::"OrderStatus"
      )
      SELECT
        o.coupon_id,
        c.code,
        COUNT(*)::bigint AS use_count,
        COALESCE(SUM(o.discount), 0)::bigint AS discount,
        COALESCE(SUM(o.total), 0)::bigint AS revenue
      FROM delivered o
      JOIN coupons c ON c.id = o.coupon_id
      WHERE (o.delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
        BETWEEN ${range.from}::date AND ${range.to}::date
      GROUP BY o.coupon_id, c.code
      ORDER BY use_count DESC, revenue DESC, c.code ASC
    `)
    return {
      items: rows.map((row) => ({
        couponId: row.coupon_id,
        code: row.code,
        uses: toNumber(row.use_count),
        discount: toNumber(row.discount),
        revenue: toNumber(row.revenue),
      })),
    }
  }

  /**
   * Sales overlapping the range with matching delivered lines (R5). A line counts
   * when the delivered order was created inside the sale window and its unit
   * price equals the sale price; discount is the approximate «خصم تقريبي».
   */
  async flashSales(range: DateRange): Promise<{ items: FlashSaleReportRow[] }> {
    const rows = await this.prisma.$queryRaw<FlashSaleSqlRow[]>(Prisma.sql`
      WITH delivered AS (
        SELECT
          o.id,
          o.created_at,
          COALESCE(
            (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
            o.updated_at
          ) AS delivered_at
        FROM orders o
        WHERE o.status = 'delivered'::"OrderStatus"
      ),
      overlapping_sales AS (
        SELECT fs.id, fs.name, fs.starts_at, fs.ends_at
        FROM flash_sales fs
        WHERE (fs.starts_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date <= ${range.to}::date
          AND (fs.ends_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date >= ${range.from}::date
      ),
      matching_lines AS (
        SELECT
          s.id AS flash_sale_id,
          oi.qty,
          oi.unit_price,
          fsi.sale_price,
          p.price AS regular_price
        FROM delivered d
        JOIN order_items oi ON oi.order_id = d.id
        JOIN flash_sale_items fsi ON fsi.product_id = oi.product_id
        JOIN overlapping_sales s ON s.id = fsi.flash_sale_id
        JOIN products p ON p.id = fsi.product_id
        WHERE d.created_at >= s.starts_at
          AND d.created_at <= s.ends_at
          AND oi.unit_price = fsi.sale_price
          AND (d.delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
            BETWEEN ${range.from}::date AND ${range.to}::date
      ),
      per_sale AS (
        SELECT
          flash_sale_id,
          COALESCE(SUM(qty), 0)::bigint AS units,
          COALESCE(SUM(qty * unit_price), 0)::bigint AS revenue,
          COALESCE(SUM(GREATEST(regular_price - sale_price, 0) * qty), 0)::bigint AS discount
        FROM matching_lines
        GROUP BY flash_sale_id
      )
      SELECT
        s.id AS flash_sale_id,
        s.name,
        TO_CHAR(s.starts_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at,
        TO_CHAR(s.ends_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ends_at,
        COALESCE(ps.units, 0) AS units,
        COALESCE(ps.revenue, 0) AS revenue,
        COALESCE(ps.discount, 0) AS discount
      FROM overlapping_sales s
      LEFT JOIN per_sale ps ON ps.flash_sale_id = s.id
      ORDER BY s.starts_at, s.id
    `)
    return {
      items: rows.map((row) => ({
        flashSaleId: row.flash_sale_id,
        name: row.name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        units: toNumber(row.units),
        revenue: toNumber(row.revenue),
        discount: toNumber(row.discount),
      })),
    }
  }

  /** Bridal funnel: lists → paid reservations → delivered, with step percentages (FR-010). */
  async bridalFunnel(range: DateRange): Promise<BridalFunnelReport> {
    const [listsRows, reservationsRows, deliveredRows] = await Promise.all([
      this.prisma.$queryRaw<CountSqlRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM bridal_lists
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
          BETWEEN ${range.from}::date AND ${range.to}::date
      `),
      this.prisma.$queryRaw<CountSqlRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT MIN(p.at) AS first_at
          FROM orders o
          JOIN payments p ON p.order_id = o.id
          WHERE o.type = 'bridal'::"OrderType"
            AND p.status = 'confirmed'::"PaymentStatus"
          GROUP BY o.id
        ) first_payments
        WHERE (first_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
          BETWEEN ${range.from}::date AND ${range.to}::date
      `),
      this.prisma.$queryRaw<CountSqlRow[]>(Prisma.sql`
        WITH delivered AS (
          SELECT
            o.type,
            COALESCE(
              (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
              o.updated_at
            ) AS delivered_at
          FROM orders o
          WHERE o.status = 'delivered'::"OrderStatus"
        )
        SELECT COUNT(*)::bigint AS count
        FROM delivered
        WHERE delivered.type = 'bridal'::"OrderType"
          AND (delivered.delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
            BETWEEN ${range.from}::date AND ${range.to}::date
      `),
    ])

    const listsCreated = toNumber(listsRows[0]?.count ?? 0)
    const reservationsPaid = toNumber(reservationsRows[0]?.count ?? 0)
    const delivered = toNumber(deliveredRows[0]?.count ?? 0)

    return {
      listsCreated,
      reservationsPaid,
      delivered,
      listToReservationPct: percent(reservationsPaid, listsCreated),
      reservationToDeliveredPct: percent(delivered, reservationsPaid),
    }
  }

  /** All-time and in-period repeat-customer counts; only counts, never phones (FR-011, R6). */
  async repeatCustomers(range: DateRange): Promise<RepeatCustomersReport> {
    const rows = await this.prisma.$queryRaw<RepeatCustomersSqlRow[]>(Prisma.sql`
      WITH delivered AS (
        SELECT
          o.customer_phone,
          COALESCE(
            (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
            o.updated_at
          ) AS delivered_at
        FROM orders o
        WHERE o.status = 'delivered'::"OrderStatus"
      ),
      period AS (
        SELECT customer_phone, COUNT(*)::bigint AS period_count
        FROM delivered
        WHERE (delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
          BETWEEN ${range.from}::date AND ${range.to}::date
        GROUP BY customer_phone
      )
      SELECT
        (SELECT COUNT(DISTINCT customer_phone) FROM delivered)::bigint AS customers,
        (
          SELECT COUNT(*)
          FROM (
            SELECT 1 FROM delivered GROUP BY customer_phone HAVING COUNT(*) >= 2
          ) repeats
        )::bigint AS repeat_customers,
        (SELECT COUNT(DISTINCT customer_phone) FROM period)::bigint AS period_customers,
        (SELECT COUNT(*) FROM period WHERE period_count >= 2)::bigint AS period_repeat
    `)

    const row = rows[0]
    const customers = toNumber(row?.customers ?? 0)
    const repeatCustomers = toNumber(row?.repeat_customers ?? 0)
    const periodCustomers = toNumber(row?.period_customers ?? 0)
    const periodRepeat = toNumber(row?.period_repeat ?? 0)

    return {
      customers,
      repeatCustomers,
      repeatPct: percent(repeatCustomers, customers),
      periodCustomers,
      periodRepeat,
      periodRepeatPct: percent(periodRepeat, periodCustomers),
    }
  }

  /** UTF-8 BOM CSV export of any report, with an Excel-safe header attachment (FR-012). */
  async exportCsv(
    kind: ReportKind,
    range: DateRange,
    groupBy: ReportGrouping,
  ): Promise<{ csv: string; filename: string }> {
    const rows = reportCsvRows(await this.csvInput(kind, range, groupBy))
    const bom = String.fromCharCode(0xfeff)
    const crlf = String.fromCharCode(13, 10)
    const csvWithBom = `${bom}${rows.map((row) => row.map(escapeCsvCell).join(',')).join(crlf)}`
    return { csv: csvWithBom, filename: `serag-${kind}-${range.from}-${range.to}.csv` }
  }

  private csvInput(
    kind: ReportKind,
    range: DateRange,
    groupBy: ReportGrouping,
  ): Promise<ReportCsvInput> {
    switch (kind) {
      case 'revenue':
        return this.revenue(range, groupBy).then((report) => ({ kind, report }))
      case 'splits':
        return this.splits(range).then((report) => ({ kind, report }))
      case 'best-sellers':
        return this.bestSellers(range).then(({ items }) => ({ kind, report: items }))
      case 'coupons':
        return this.coupons(range).then(({ items }) => ({ kind, report: items }))
      case 'flash-sales':
        return this.flashSales(range).then(({ items }) => ({ kind, report: items }))
      case 'bridal-funnel':
        return this.bridalFunnel(range).then((report) => ({ kind, report }))
      case 'repeat-customers':
        return this.repeatCustomers(range).then((report) => ({ kind, report }))
      default: {
        const exhaustive: never = kind
        throw new Error(`Unknown report kind: ${String(exhaustive)}`)
      }
    }
  }

  /** Current status `delivered` orders inside the range, dated by their delivered event (R1). */
  private fetchDeliveredOrders(range: DateRange): Promise<SplitOrderInput[]> {
    return this.prisma
      .$queryRaw<DeliveredOrderSqlRow[]>(Prisma.sql`
        WITH delivered AS (
          SELECT
            o.id,
            o.total,
            o.discount,
            o.delivery_fee,
            o.payment_method,
            o.zone_id,
            o.type,
            COALESCE(
              (SELECT MAX(e.at) FROM order_events e WHERE e.order_id = o.id AND e.status = 'delivered'),
              o.updated_at
            ) AS delivered_at
          FROM orders o
          WHERE o.status = 'delivered'::"OrderStatus"
        )
        SELECT id, total, discount, delivery_fee, payment_method, zone_id, type
        FROM delivered
        WHERE (delivered_at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
          BETWEEN ${range.from}::date AND ${range.to}::date
      `)
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          total: toNumber(row.total),
          discount: toNumber(row.discount),
          deliveryFee: toNumber(row.delivery_fee),
          paymentMethod: row.payment_method,
          zoneId: row.zone_id,
          type: row.type,
        })),
      )
  }

  private fetchOrderLines(orderIds: string[]): Promise<OrderLineRow[]> {
    if (orderIds.length === 0) return Promise.resolve([])
    return this.prisma.orderItem.findMany({
      where: { orderId: { in: orderIds } },
      select: {
        orderId: true,
        productId: true,
        qty: true,
        unitPrice: true,
        name: true,
        modelCode: true,
        product: {
          select: {
            categoryId: true,
            brandId: true,
            name: true,
            modelCode: true,
            stock: true,
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
      },
    })
  }
}
