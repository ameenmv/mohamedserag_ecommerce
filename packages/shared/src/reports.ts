export const REPORT_PRESETS = [
  'today',
  '7d',
  '30d',
  '90d',
  'this_month',
  'last_month',
] as const
export type ReportPreset = (typeof REPORT_PRESETS)[number]

export const REPORT_GROUPINGS = ['day', 'week', 'month'] as const
export type ReportGrouping = (typeof REPORT_GROUPINGS)[number]

export const REPORT_KINDS = [
  'revenue',
  'splits',
  'best-sellers',
  'coupons',
  'flash-sales',
  'bridal-funnel',
  'repeat-customers',
] as const
export type ReportKind = (typeof REPORT_KINDS)[number]

export const STORE_TIME_ZONE = 'Africa/Cairo'

export const MAX_REPORT_DAYS = 366

export interface DateRange {
  from: string
  to: string
}

const cairoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Formats a `Date` as its `YYYY-MM-DD` calendar date in the store's Cairo time zone. */
export function cairoDateKey(date: Date): string {
  return cairoDateFormatter.format(date)
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part))
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1))
}

function toDateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Resolves a report query into inclusive Cairo calendar dates. Presets are relative
 * to `now`'s Cairo date; custom `from`/`to` are returned as given.
 */
export function resolveReportRange(
  input: { preset?: ReportPreset; from?: string; to?: string },
  now: Date,
): DateRange {
  const today = cairoDateKey(now)

  if (input.preset) {
    switch (input.preset) {
      case 'today':
        return { from: today, to: today }
      case '7d':
        return { from: addDays(today, -6), to: today }
      case '30d':
        return { from: addDays(today, -29), to: today }
      case '90d':
        return { from: addDays(today, -89), to: today }
      case 'this_month': {
        const month = today.slice(0, 7)
        return { from: `${month}-01`, to: today }
      }
      case 'last_month': {
        const todayDate = parseDateKey(today)
        const year = todayDate.getUTCFullYear()
        const month = todayDate.getUTCMonth() + 1
        const prevYear = month === 1 ? year - 1 : year
        const prevMonth = month === 1 ? 12 : month - 1
        const monthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
        return {
          from: `${monthKey}-01`,
          to: `${monthKey}-${String(daysInMonth(prevYear, prevMonth)).padStart(2, '0')}`,
        }
      }
    }
  }

  return { from: input.from ?? today, to: input.to ?? today }
}

/** Returns the Saturday that starts the Cairo week containing `dateKey`. */
function weekStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey)
  // getUTCDay(): Sunday = 0 … Saturday = 6. Saturday starts the store week.
  const offset = (date.getUTCDay() + 1) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return toDateKey(date)
}

/** Maps a Cairo date key to its bucket key for the requested grouping. */
export function bucketKey(dateKey: string, groupBy: ReportGrouping): string {
  switch (groupBy) {
    case 'day':
      return dateKey
    case 'week':
      return weekStartKey(dateKey)
    case 'month':
      return dateKey.slice(0, 7)
  }
}

/** Ordered, unique bucket keys covering `range` for the requested grouping. */
export function bucketKeys(range: DateRange, groupBy: ReportGrouping): string[] {
  const keys: string[] = []
  const seen = new Set<string>()

  let cursor = range.from
  while (cursor <= range.to) {
    const key = bucketKey(cursor, groupBy)
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
    cursor = addDays(cursor, 1)
  }

  return keys
}

/**
 * Returns a dense, ordered array of rows keyed by every bucket in `range`,
 * substituting `empty(key)` for buckets with no matching row.
 */
export function fillBuckets<T extends { key: string }>(
  range: DateRange,
  groupBy: ReportGrouping,
  rows: T[],
  empty: (key: string) => T,
): T[] {
  const byKey = new Map<string, T>()
  for (const row of rows) {
    byKey.set(row.key, row)
  }

  return bucketKeys(range, groupBy).map((key) => byKey.get(key) ?? empty(key))
}

/** Returns the range of the same length immediately preceding `range`. */
export function previousRange(range: DateRange): DateRange {
  const from = parseDateKey(range.from)
  const to = parseDateKey(range.to)
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  const previousTo = addDays(range.from, -1)
  const previousFrom = addDays(previousTo, -(spanDays - 1))
  return { from: previousFrom, to: previousTo }
}

/** Average order value in piastres, rounded; 0 when there are no orders. */
export function averageOrderValue(revenue: number, orders: number): number {
  if (orders <= 0) return 0
  return Math.round(revenue / orders)
}

/** Percentage of `part` in `whole`, rounded to one decimal; 0 when `whole` is 0. */
export function percent(part: number, whole: number): number {
  if (whole === 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

/**
 * Splits `discount` across lines proportionally to `amount`, using largest-remainder
 * rounding so integer shares sum exactly to `discount`.
 */
export function splitDiscount(
  lines: { key: string; amount: number }[],
  discount: number,
): Map<string, number> {
  const shares = new Map<string, number>()
  if (lines.length === 0) return shares

  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  if (total <= 0 || discount === 0) {
    for (const line of lines) shares.set(line.key, 0)
    return shares
  }

  const remainders: { key: string; remainder: number; index: number }[] = []
  let assigned = 0

  lines.forEach((line, index) => {
    const exact = (line.amount * discount) / total
    const floor = Math.floor(exact)
    assigned += floor
    // Lines may share a key (e.g. two products of one category): accumulate per key
    shares.set(line.key, (shares.get(line.key) ?? 0) + floor)
    remainders.push({ key: line.key, remainder: exact - floor, index })
  })

  let leftover = discount - assigned
  remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const entry of remainders) {
    if (leftover <= 0) break
    shares.set(entry.key, (shares.get(entry.key) ?? 0) + 1)
    leftover -= 1
  }

  return shares
}

export interface RevenueBucket {
  key: string
  revenue: number
  orders: number
  aov: number
}

export interface RevenueReport {
  from: string
  to: string
  groupBy: ReportGrouping
  buckets: RevenueBucket[]
  totals: { revenue: number; orders: number; aov: number }
}

export interface SplitRow {
  id: string | null
  label: string
  revenue: number
  orders: number
}

export interface SplitsReport {
  from: string
  to: string
  byCategory: SplitRow[]
  byBrand: SplitRow[]
  byPaymentMethod: SplitRow[]
  byZone: SplitRow[]
  byType: SplitRow[]
}

export interface BestSellerRow {
  productId: string
  name: string
  modelCode: string
  units: number
  revenue: number
  stock: number
}

export interface CouponReportRow {
  couponId: string
  code: string
  uses: number
  discount: number
  revenue: number
}

export interface FlashSaleReportRow {
  flashSaleId: string
  name: string
  startsAt: string
  endsAt: string
  units: number
  revenue: number
  discount: number
}

export interface BridalFunnelReport {
  listsCreated: number
  reservationsPaid: number
  delivered: number
  listToReservationPct: number
  reservationToDeliveredPct: number
}

export interface RepeatCustomersReport {
  customers: number
  repeatCustomers: number
  repeatPct: number
  periodCustomers: number
  periodRepeat: number
  periodRepeatPct: number
}

export interface ReportQuery {
  from: string
  to: string
  groupBy: ReportGrouping
}

const UNDEFINED_LABEL = 'غير محدد'

const REVENUE_HEADER = ['الفترة', 'الإيراد (ج.م)', 'عدد الطلبات', 'متوسط الطلب (ج.م)']
const BEST_SELLERS_HEADER = ['المنتج', 'كود الموديل', 'الكمية', 'الإيراد (ج.م)', 'المخزون']
const COUPONS_HEADER = ['الكوبون', 'عدد الاستخدامات', 'الخصم (ج.م)', 'الإيراد (ج.م)']
const FLASH_SALES_HEADER = [
  'العرض',
  'الكمية',
  'الإيراد (ج.م)',
  'الخصم التقريبي (ج.م)',
]
const FUNNEL_HEADER = ['المرحلة', 'العدد', 'نسبة التحويل %']
const REPEAT_HEADER = ['البند', 'العدد', 'النسبة %']

/** Formats integer piastres as pounds with two decimals (`'1234.50'`). */
function pounds(piastres: number): string {
  return (Math.round(piastres) / 100).toFixed(2)
}

/** Formats a percentage to one decimal (`'12.5'`). */
function percentage(value: number): string {
  return value.toFixed(1)
}

function splitSection(label: string, rows: SplitRow[]): string[][] {
  return rows.map((row) => [
    `${label}: ${row.label || UNDEFINED_LABEL}`,
    pounds(row.revenue),
    String(row.orders),
  ])
}

/** Builds the header row plus data rows for a report, ready to be CSV-escaped by the API. */
/** A report together with its kind, so CSV building is type-checked per report. */
export type ReportCsvInput =
  | { kind: 'revenue'; report: RevenueReport }
  | { kind: 'splits'; report: SplitsReport }
  | { kind: 'best-sellers'; report: BestSellerRow[] }
  | { kind: 'coupons'; report: CouponReportRow[] }
  | { kind: 'flash-sales'; report: FlashSaleReportRow[] }
  | { kind: 'bridal-funnel'; report: BridalFunnelReport }
  | { kind: 'repeat-customers'; report: RepeatCustomersReport }

export function reportCsvRows(input: ReportCsvInput): string[][] {
  switch (input.kind) {
    case 'revenue': {
      const data = input.report
      const rows: string[][] = [REVENUE_HEADER]
      for (const bucket of data.buckets) {
        rows.push([bucket.key, pounds(bucket.revenue), String(bucket.orders), pounds(bucket.aov)])
      }
      rows.push([
        'الإجمالي',
        pounds(data.totals.revenue),
        String(data.totals.orders),
        pounds(data.totals.aov),
      ])
      return rows
    }
    case 'splits': {
      const data = input.report
      const rows: string[][] = [['التقسيم', 'الإيراد (ج.م)', 'عدد الطلبات']]
      rows.push(...splitSection('القسم', data.byCategory))
      rows.push(...splitSection('الماركة', data.byBrand))
      rows.push(...splitSection('طريقة الدفع', data.byPaymentMethod))
      rows.push(...splitSection('المنطقة', data.byZone))
      rows.push(...splitSection('النوع', data.byType))
      return rows
    }
    case 'best-sellers': {
      const items = input.report
      const rows: string[][] = [BEST_SELLERS_HEADER]
      for (const item of items) {
        rows.push([
          item.name,
          item.modelCode,
          String(item.units),
          pounds(item.revenue),
          String(item.stock),
        ])
      }
      return rows
    }
    case 'coupons': {
      const items = input.report
      const rows: string[][] = [COUPONS_HEADER]
      for (const item of items) {
        rows.push([
          item.code,
          String(item.uses),
          pounds(item.discount),
          pounds(item.revenue),
        ])
      }
      return rows
    }
    case 'flash-sales': {
      const items = input.report
      const rows: string[][] = [FLASH_SALES_HEADER]
      for (const item of items) {
        rows.push([
          item.name,
          String(item.units),
          pounds(item.revenue),
          pounds(item.discount),
        ])
      }
      return rows
    }
    case 'bridal-funnel': {
      const data = input.report
      return [
        FUNNEL_HEADER,
        ['قوائم اتعملت', String(data.listsCreated), ''],
        ['حجوزات بعربون', String(data.reservationsPaid), percentage(data.listToReservationPct)],
        ['اتسلّمت', String(data.delivered), percentage(data.reservationToDeliveredPct)],
      ]
    }
    case 'repeat-customers': {
      const data = input.report
      return [
        REPEAT_HEADER,
        ['عملاء (إجمالي)', String(data.customers), ''],
        ['عملاء متكررون (إجمالي)', String(data.repeatCustomers), percentage(data.repeatPct)],
        ['عملاء (الفترة)', String(data.periodCustomers), ''],
        ['عملاء متكررون (الفترة)', String(data.periodRepeat), percentage(data.periodRepeatPct)],
      ]
    }
  }
}
