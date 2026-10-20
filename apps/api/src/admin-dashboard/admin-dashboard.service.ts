import { Injectable } from '@nestjs/common'
import {
  cairoDateKey,
  DASHBOARD_COUNTERS,
  deriveAvailability,
  fillBuckets,
  lockEndDate,
  previousRange,
  STORE_TIME_ZONE,
  sumSeries,
  visibleCounters,
  type AvailabilityMode,
  type DashboardCounter,
  type DashboardCounterId,
  type DashboardRange,
  type DashboardSeriesPoint,
  type DashboardSummary,
  type DateRange,
  type Permission,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

interface SeriesRow {
  day: string
  revenue: bigint | number
  delivered_orders: bigint | number
}

interface DepositRow {
  day: string
  deposits: bigint | number
}

interface NotifyProductRow {
  id: string
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
}

function toNumber(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value
}

/** Cairo date key for a `Date` shifted by whole days (used to build the day window). */
function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part))
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1))
  date.setUTCDate(date.getUTCDate() + days)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(range: DashboardRange, permissions: Set<Permission>): Promise<DashboardSummary> {
    const counters = await this.buildCounters(permissions)
    const series = await this.buildSeries(this.rangeOf(range))
    const previous = await this.buildSeries(previousRange(this.rangeOf(range)))

    return {
      range,
      counters,
      series,
      totals: sumSeries(series),
      previousTotals: sumSeries(previous),
    }
  }

  /** Inclusive Cairo date window covering the last `range` days ending today. */
  private rangeOf(range: DashboardRange): DateRange {
    const today = cairoDateKey(new Date())
    return { from: shiftDateKey(today, -(range - 1)), to: today }
  }

  private async buildCounters(permissions: Set<Permission>): Promise<DashboardCounter[]> {
    const counterIds: DashboardCounterId[] = DASHBOARD_COUNTERS.map((counter) => counter.id)
    const allowed = visibleCounters(counterIds, (permission) => permissions.has(permission))

    const countById = new Map<DashboardCounterId, number>()

    await Promise.all(
      allowed.map(async (counter) => {
        const count = await this.countFor(counter.id)
        countById.set(counter.id, count)
      }),
    )

    return allowed.map((counter) => ({
      id: counter.id,
      count: countById.get(counter.id) ?? 0,
      href: counter.href,
    }))
  }

  private async countFor(id: DashboardCounterId): Promise<number> {
    switch (id) {
      case 'newOrders':
        return this.prisma.order.count({ where: { status: 'new' } })
      case 'awaitingPayment':
        return this.prisma.order.count({ where: { status: 'awaiting_payment' } })
      case 'awaitingDeposit':
        return this.prisma.order.count({ where: { status: 'awaiting_deposit' } })
      case 'locksExpiring':
        return this.prisma.order.count({
          where: {
            type: 'bridal',
            status: 'confirmed',
            bridalStatus: 'locked',
            lockedUntil: { not: null, lte: lockEndDate(new Date(), 7) },
          },
        })
      case 'pendingReviews':
        return this.prisma.review.count({ where: { status: 'pending' } })
      case 'notifyReady':
        return this.countNotifyReady()
      case 'lowStock':
        return this.countLowStock()
      default: {
        const exhaustive: never = id
        throw new Error(`Unknown dashboard counter: ${String(exhaustive)}`)
      }
    }
  }

  /**
   * Visible, non-archived products whose automatic stock fell to or below their own
   * low-stock threshold. The column-to-column comparison needs raw SQL.
   */
  private async countLowStock(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE p.visible = true
        AND p.archived_at IS NULL
        AND p.availability_mode = 'auto'::"AvailabilityMode"
        AND p.stock <= p.low_stock_threshold
    `)
    return toNumber(rows[0]?.count ?? 0)
  }

  /**
   * Distinct products orderable again (visible, not archived, derivable availability
   * not `out`) that still have at least one `waiting` notify request. Candidates are
   * fetched in one query, then filtered in code with `deriveAvailability`.
   */
  private async countNotifyReady(): Promise<number> {
    const grouped = await this.prisma.notifyRequest.groupBy({
      by: ['productId'],
      where: { status: 'waiting' },
    })

    if (grouped.length === 0) return 0

    const productIds = grouped.map((row) => row.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, visible: true, archivedAt: null },
      select: {
        id: true,
        stock: true,
        lowStockThreshold: true,
        availabilityMode: true,
      },
    })

    return products.filter((row: NotifyProductRow) => {
      const availability = deriveAvailability({
        mode: row.availabilityMode,
        stock: row.stock,
        lowStockThreshold: row.lowStockThreshold,
      })
      return availability.state !== 'out'
    }).length
  }

  private async buildSeries(window: DateRange): Promise<DashboardSeriesPoint[]> {
    const [revenueRows, depositRows] = await Promise.all([
      this.revenueRows(window),
      this.depositRows(window),
    ])

    const revenueByDay = new Map<string, { revenue: number; deliveredOrders: number }>()
    for (const row of revenueRows) {
      revenueByDay.set(row.day, {
        revenue: toNumber(row.revenue),
        deliveredOrders: toNumber(row.delivered_orders),
      })
    }

    const depositsByDay = new Map<string, number>()
    for (const row of depositRows) {
      depositsByDay.set(row.day, toNumber(row.deposits))
    }

    const rows = Array.from(
      new Set([...revenueByDay.keys(), ...depositsByDay.keys()]),
    ).map<{ key: string; point: DashboardSeriesPoint }>((key) => ({
      key,
      point: {
        date: key,
        revenue: revenueByDay.get(key)?.revenue ?? 0,
        deliveredOrders: revenueByDay.get(key)?.deliveredOrders ?? 0,
        deposits: depositsByDay.get(key) ?? 0,
      },
    }))

    return fillBuckets(window, 'day', rows, (key) => ({
      key,
      point: { date: key, revenue: 0, deliveredOrders: 0, deposits: 0 },
    })).map((entry) => entry.point)
  }

  private revenueRows(range: DateRange): Promise<SeriesRow[]> {
    return this.prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
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
  }

  private depositRows(range: DateRange): Promise<DepositRow[]> {
    return this.prisma.$queryRaw<DepositRow[]>(Prisma.sql`
      SELECT
        TO_CHAR((p.at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(p.amount), 0)::bigint AS deposits
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.status = 'confirmed'::"PaymentStatus"
        AND (o.deposit_amount IS NOT NULL OR o.type = 'bridal'::"OrderType")
        AND (p.at AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE})::date
          BETWEEN ${range.from}::date AND ${range.to}::date
      GROUP BY day
    `)
  }
}
