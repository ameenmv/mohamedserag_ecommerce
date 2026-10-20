import { PERMISSIONS, type Permission } from './enums.js'

export interface DashboardCounterDefinition {
  id: string
  labelKey: string
  href: string
  permission: Permission
}

export const DASHBOARD_COUNTERS = [
  {
    id: 'newOrders',
    labelKey: 'admin.dashboard.counters.newOrders',
    href: '/admin/orders?status=new',
    permission: PERMISSIONS.orders.read,
  },
  {
    id: 'awaitingPayment',
    labelKey: 'admin.dashboard.counters.awaitingPayment',
    href: '/admin/orders?status=awaiting_payment',
    permission: PERMISSIONS.orders.read,
  },
  {
    id: 'awaitingDeposit',
    labelKey: 'admin.dashboard.counters.awaitingDeposit',
    href: '/admin/orders?status=awaiting_deposit',
    permission: PERMISSIONS.orders.read,
  },
  {
    id: 'locksExpiring',
    labelKey: 'admin.dashboard.counters.locksExpiring',
    href: '/admin/orders?type=bridal&lockExpiring=7',
    permission: PERMISSIONS.bridal.manage,
  },
  {
    id: 'pendingReviews',
    labelKey: 'admin.dashboard.counters.pendingReviews',
    href: '/admin/reviews?tab=pending',
    permission: PERMISSIONS.reviews.moderate,
  },
  {
    id: 'notifyReady',
    labelKey: 'admin.dashboard.counters.notifyReady',
    href: '/admin/notify?ready=1',
    permission: PERMISSIONS.notify.manage,
  },
  {
    id: 'lowStock',
    labelKey: 'admin.dashboard.counters.lowStock',
    href: '/admin/products?stock=low',
    permission: PERMISSIONS.products.read,
  },
] as const satisfies readonly DashboardCounterDefinition[]

export type DashboardCounterId = (typeof DASHBOARD_COUNTERS)[number]['id']

export interface DashboardCounter {
  id: DashboardCounterId
  count: number
  href: string
}

export type DashboardRange = 7 | 30 | 90

export interface DashboardSeriesPoint {
  date: string
  revenue: number
  deliveredOrders: number
  deposits: number
}

export interface DashboardTotals {
  revenue: number
  deliveredOrders: number
  deposits: number
}

export interface DashboardSummary {
  range: DashboardRange
  counters: DashboardCounter[]
  series: DashboardSeriesPoint[]
  totals: DashboardTotals
  previousTotals: DashboardTotals
}

/** Returns the counters the caller is allowed to open, in canonical order. */
export function visibleCounters(
  ids: readonly DashboardCounterId[],
  can: (permission: Permission) => boolean,
): (typeof DASHBOARD_COUNTERS)[number][] {
  const wanted = new Set(ids)
  return DASHBOARD_COUNTERS.filter((counter) => wanted.has(counter.id) && can(counter.permission))
}

/** Sums a chart series into period totals. */
export function sumSeries(series: DashboardSeriesPoint[]): DashboardTotals {
  return series.reduce<DashboardTotals>(
    (totals, point) => ({
      revenue: totals.revenue + point.revenue,
      deliveredOrders: totals.deliveredOrders + point.deliveredOrders,
      deposits: totals.deposits + point.deposits,
    }),
    { revenue: 0, deliveredOrders: 0, deposits: 0 },
  )
}

/** Percent change from `previous` to `current`, one decimal; null when previous is 0. */
export function periodChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
