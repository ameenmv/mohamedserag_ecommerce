import type {
  BestSellerRow,
  BridalFunnelReport,
  CouponReportRow,
  FlashSaleReportRow,
  ReportGrouping,
  ReportKind,
  ReportPreset,
  RepeatCustomersReport,
  RevenueReport,
  SplitsReport,
} from '@serag/shared'
import {
  percent,
  REPORT_GROUPINGS,
  REPORT_KINDS,
  REPORT_PRESETS,
  reportQuerySchema,
  resolveReportRange,
} from '@serag/shared'
import { formatDate, formatDayMonth, formatMonthYear } from './date-format'

export type AdminReportPayload =
  | { kind: 'revenue'; data: RevenueReport }
  | { kind: 'splits'; data: SplitsReport }
  | { kind: 'best-sellers'; data: { items: BestSellerRow[] } }
  | { kind: 'coupons'; data: { items: CouponReportRow[] } }
  | { kind: 'flash-sales'; data: { items: FlashSaleReportRow[] } }
  | { kind: 'bridal-funnel'; data: BridalFunnelReport }
  | { kind: 'repeat-customers'; data: RepeatCustomersReport }

export const REPORT_TAB_LABEL_KEYS: Record<ReportKind, string> = {
  revenue: 'admin.reports.tabs.revenue',
  splits: 'admin.reports.tabs.splits',
  'best-sellers': 'admin.reports.tabs.bestSellers',
  coupons: 'admin.reports.tabs.coupons',
  'flash-sales': 'admin.reports.tabs.flashSales',
  'bridal-funnel': 'admin.reports.tabs.bridalFunnel',
  'repeat-customers': 'admin.reports.tabs.repeatCustomers',
}

export const REPORT_PRESET_LABEL_KEYS: Record<ReportPreset | 'custom', string> = {
  today: 'admin.reports.period.presets.today',
  '7d': 'admin.reports.period.presets.d7',
  '30d': 'admin.reports.period.presets.d30',
  '90d': 'admin.reports.period.presets.d90',
  this_month: 'admin.reports.period.presets.thisMonth',
  last_month: 'admin.reports.period.presets.lastMonth',
  custom: 'admin.reports.period.presets.custom',
}

export const REPORT_GROUPING_LABEL_KEYS: Record<ReportGrouping, string> = {
  day: 'admin.reports.period.groupings.day',
  week: 'admin.reports.period.groupings.week',
  month: 'admin.reports.period.groupings.month',
}

/** The report query state as the URL holds it. */
export interface AdminReportQueryState {
  tab: ReportKind
  preset: ReportPreset | 'custom'
  from?: string
  to?: string
  groupBy: ReportGrouping
}

const DEFAULT_PRESET: ReportPreset = '30d'
const DEFAULT_GROUPING: ReportGrouping = 'day'

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }
  return typeof value === 'string' ? value : undefined
}

function isReportKind(value: string): value is ReportKind {
  return REPORT_KINDS.some((kind) => kind === value)
}

function isReportPreset(value: string): value is ReportPreset {
  return REPORT_PRESETS.some((preset) => preset === value)
}

function isReportGrouping(value: string): value is ReportGrouping {
  return REPORT_GROUPINGS.some((grouping) => grouping === value)
}

/**
 * Reads the report query from the route query. A valid `preset` wins; otherwise the raw
 * `from`/`to` strings are kept (even when invalid) so `reportQuerySchema` can surface
 * the problem. Falls back to the `30d`/`day` defaults when the URL carries nothing usable.
 */
export function deserializeReportQuery(rawQuery: Record<string, unknown>): AdminReportQueryState {
  const rawTab = firstQueryValue(rawQuery.tab)
  const tab: ReportKind = rawTab && isReportKind(rawTab) ? rawTab : 'revenue'

  const rawPreset = firstQueryValue(rawQuery.preset)
  const rawFrom = firstQueryValue(rawQuery.from)
  const rawTo = firstQueryValue(rawQuery.to)

  let preset: ReportPreset | 'custom'
  let from: string | undefined
  let to: string | undefined

  if (rawPreset && isReportPreset(rawPreset)) {
    preset = rawPreset
  } else if (rawFrom !== undefined && rawTo !== undefined) {
    preset = 'custom'
    from = rawFrom
    to = rawTo
  } else if (rawFrom !== undefined || rawTo !== undefined) {
    // Keep the partial pair so Zod reports the missing half.
    preset = 'custom'
    from = rawFrom
    to = rawTo
  } else {
    preset = DEFAULT_PRESET
  }

  const rawGroupBy = firstQueryValue(rawQuery.groupBy)
  const groupBy: ReportGrouping = rawGroupBy && isReportGrouping(rawGroupBy) ? rawGroupBy : DEFAULT_GROUPING

  return { tab, preset, from, to, groupBy }
}

/** Serializes state to route-query form, omitting defaults so URLs stay clean. */
export function serializeReportQuery(state: AdminReportQueryState): Record<string, string> {
  const query: Record<string, string> = { tab: state.tab }
  if (state.preset === 'custom') {
    if (state.from) query.from = state.from
    if (state.to) query.to = state.to
  } else if (state.preset !== DEFAULT_PRESET) {
    query.preset = state.preset
  }
  if (state.groupBy !== DEFAULT_GROUPING) query.groupBy = state.groupBy
  return query
}

export interface AdminReportApiQuery {
  [key: string]: string
  from: string
  to: string
  groupBy: ReportGrouping
}

/** The API query always resolves presets to explicit dates and always includes `groupBy`. */
export function toApiQuery(state: AdminReportQueryState, now: Date): AdminReportApiQuery {
  if (state.preset === 'custom') {
    return {
      from: state.from ?? '',
      to: state.to ?? '',
      groupBy: state.groupBy,
    }
  }
  const range = resolveReportRange({ preset: state.preset }, now)
  return { from: range.from, to: range.to, groupBy: state.groupBy }
}

/** Zod-validates the state, returning the first Arabic error message or `null`. */
export function validateReportQuery(state: AdminReportQueryState): string | null {
  const candidate =
    state.preset === 'custom'
      ? { from: state.from, to: state.to, groupBy: state.groupBy }
      : { preset: state.preset, groupBy: state.groupBy }
  const result = reportQuerySchema.safeParse(candidate)
  if (result.success) return null
  return result.error.issues[0]?.message ?? null
}

/** Human label for a bucket key: `YYYY-MM-DD` → localized date, `YYYY-MM` → `Oct 2026`. */
export function formatBucketLabel(key: string, locale: string): string {
  if (key.length === 7) return formatMonthYear(key, locale)
  return formatDate(`${key}T00:00:00Z`, locale)
}

/** Short chart-axis label: day + month for day/week keys, month + year for month keys. */
export function formatBucketAxisLabel(key: string, locale: string): string {
  if (key.length === 7) return formatMonthYear(key, locale)
  return formatDayMonth(`${key}T00:00:00Z`, locale)
}

/** Percentage of `part` in `whole` as a fixed one-decimal string (e.g. `'12.5'`). */
export function sharePercent(part: number, whole: number): string {
  return percent(part, whole).toFixed(1)
}
