import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_COUNTERS,
  periodChange,
  sumSeries,
  visibleCounters,
  type DashboardSeriesPoint,
} from './dashboard.js'
import { PERMISSIONS } from './enums.js'

describe('DASHBOARD_COUNTERS', () => {
  it('is the seven counters in order', () => {
    expect(DASHBOARD_COUNTERS.map((counter) => counter.id)).toEqual([
      'newOrders',
      'awaitingPayment',
      'awaitingDeposit',
      'locksExpiring',
      'pendingReviews',
      'notifyReady',
      'lowStock',
    ])
  })

  it('gives every counter a label key and a link', () => {
    for (const counter of DASHBOARD_COUNTERS) {
      expect(counter.labelKey).toBe(`admin.dashboard.counters.${counter.id}`)
      expect(counter.href.startsWith('/admin/')).toBe(true)
    }
  })

  it('uses the bridal lock and low-stock filters', () => {
    const locks = DASHBOARD_COUNTERS.find((counter) => counter.id === 'locksExpiring')
    const lowStock = DASHBOARD_COUNTERS.find((counter) => counter.id === 'lowStock')
    expect(locks?.href).toBe('/admin/orders?type=bridal&lockExpiring=7')
    expect(locks?.permission).toBe(PERMISSIONS.bridal.manage)
    expect(lowStock?.href).toBe('/admin/products?stock=low')
    expect(lowStock?.permission).toBe(PERMISSIONS.products.read)
  })
})

describe('visibleCounters', () => {
  it('hides counters the caller cannot open', () => {
    const allowed = visibleCounters(
      ['newOrders', 'pendingReviews', 'lowStock'],
      (permission) => permission === PERMISSIONS.orders.read,
    )
    expect(allowed.map((counter) => counter.id)).toEqual(['newOrders'])
  })

  it('keeps canonical order', () => {
    const all = DASHBOARD_COUNTERS.map((counter) => counter.id)
    const allowed = visibleCounters(all, () => true)
    expect(allowed.map((counter) => counter.id)).toEqual(all)
  })
})

describe('sumSeries', () => {
  it('sums the series', () => {
    const series: DashboardSeriesPoint[] = [
      { date: '2026-03-14', revenue: 100, deliveredOrders: 1, deposits: 50 },
      { date: '2026-03-15', revenue: 250, deliveredOrders: 2, deposits: 0 },
    ]
    expect(sumSeries(series)).toEqual({ revenue: 350, deliveredOrders: 3, deposits: 50 })
  })

  it('returns zeros for an empty series', () => {
    expect(sumSeries([])).toEqual({ revenue: 0, deliveredOrders: 0, deposits: 0 })
  })
})

describe('periodChange', () => {
  it('returns a one-decimal percentage change', () => {
    expect(periodChange(150, 100)).toBe(50)
    expect(periodChange(80, 100)).toBe(-20)
    expect(periodChange(1, 3)).toBe(-66.7)
  })

  it('returns null when previous is 0', () => {
    expect(periodChange(100, 0)).toBeNull()
    expect(periodChange(0, 0)).toBeNull()
  })
})
