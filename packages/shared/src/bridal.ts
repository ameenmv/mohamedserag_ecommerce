import type { AvailabilityMode, BridalStatus, OrderStatus } from './enums.js'
import { deriveAvailability } from './availability.js'

export const BRIDAL_ROOM_KEYS = [
  'kitchen',
  'laundry',
  'living',
  'bedrooms',
  'small_appliances',
  'kitchenware',
] as const

export type BridalRoomKey = (typeof BRIDAL_ROOM_KEYS)[number]

export const CATEGORY_ROOM: Record<string, BridalRoomKey> = {
  refrigerators: 'kitchen',
  cookers: 'kitchen',
  washers: 'laundry',
  tvs: 'living',
  acs: 'bedrooms',
  cookware: 'kitchenware',
}

export function roomForCategory(slug: string | null | undefined): BridalRoomKey {
  if (slug && Object.prototype.hasOwnProperty.call(CATEGORY_ROOM, slug)) {
    return CATEGORY_ROOM[slug]!
  }
  return 'small_appliances'
}

export const BRIDAL_MAX_QTY = 10
export const BRIDAL_MAX_ROOM_ITEMS = 40
export const BRIDAL_MAX_LIST_ITEMS = 120

export const DEFAULT_BRIDAL_SETTINGS = {
  depositPct: 10,
  lockDays: 30,
} as const

export interface BridalRoomItem {
  productId: string
  qty: number
}

export interface BridalRoom {
  key: BridalRoomKey
  items: BridalRoomItem[]
}

export type BridalRooms = BridalRoom[]

export function normalizeRooms(rooms: readonly BridalRoom[]): BridalRoom[] {
  const roomMap = new Map<BridalRoomKey, Map<string, number>>()

  for (const room of rooms) {
    if (!BRIDAL_ROOM_KEYS.includes(room.key)) {
      continue
    }

    let itemMap = roomMap.get(room.key)
    if (!itemMap) {
      itemMap = new Map<string, number>()
      roomMap.set(room.key, itemMap)
    }

    for (const item of room.items) {
      if (!item.productId || typeof item.productId !== 'string') {
        continue
      }
      const trimmedId = item.productId.trim()
      if (trimmedId.length === 0) {
        continue
      }
      const existingQty = itemMap.get(trimmedId) ?? 0
      const newQty = Math.min(BRIDAL_MAX_QTY, Math.max(1, existingQty + (item.qty || 1)))
      itemMap.set(trimmedId, newQty)
    }
  }

  const result: BridalRoom[] = []

  for (const key of BRIDAL_ROOM_KEYS) {
    const itemMap = roomMap.get(key)
    if (!itemMap || itemMap.size === 0) {
      continue
    }

    const items: BridalRoomItem[] = []
    for (const [productId, qty] of itemMap.entries()) {
      items.push({ productId, qty })
    }

    if (items.length > 0) {
      result.push({ key, items })
    }
  }

  return result
}

export function addItemToRooms(
  rooms: readonly BridalRoom[],
  roomKey: BridalRoomKey,
  productId: string,
  qty = 1,
): BridalRoom[] {
  const cloned: BridalRoom[] = rooms.map((r) => ({
    key: r.key,
    items: r.items.map((i) => ({ productId: i.productId, qty: i.qty })),
  }))

  const existingRoom = cloned.find((r) => r.key === roomKey)
  const validQty = Math.max(1, Math.min(BRIDAL_MAX_QTY, qty))

  if (existingRoom) {
    existingRoom.items.push({ productId, qty: validQty })
  } else {
    cloned.push({
      key: roomKey,
      items: [{ productId, qty: validQty }],
    })
  }

  return normalizeRooms(cloned)
}

export interface BridalProductRecord {
  id: string
  slug: string
  name: string
  modelCode: string
  imageUrl: string | null
  categorySlug: string
  price: number
  stock: number
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
  purchasable: boolean
  taxRate?: number
}

export interface PricedBridalItem {
  productId: string
  slug: string
  name: string
  modelCode: string
  imageUrl: string | null
  categorySlug: string
  qty: number
  unitPrice: number
  lineTotal: number
  available: boolean
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
}

export interface PricedBridalRoom {
  key: BridalRoomKey
  subtotal: number
  items: PricedBridalItem[]
}

export interface PricedRoomsResult {
  rooms: PricedBridalRoom[]
  itemCount: number
  total: number
  unavailable: number
}

export function priceRooms(
  rooms: readonly BridalRoom[],
  products: Map<string, BridalProductRecord>,
): PricedRoomsResult {
  const pricedRooms: PricedBridalRoom[] = []
  let total = 0
  let itemCount = 0
  let unavailable = 0

  for (const room of rooms) {
    const pricedItems: PricedBridalItem[] = []
    let roomSubtotal = 0

    for (const item of room.items) {
      const product = products.get(item.productId)
      if (!product) {
        continue
      }

      const avail = deriveAvailability({
        mode: product.availabilityMode,
        stock: product.stock,
        lowStockThreshold: 0,
      })

      const available = product.purchasable && avail.orderable
      const unitPrice = product.price
      const lineTotal = item.qty * unitPrice

      if (available) {
        roomSubtotal += lineTotal
      } else {
        unavailable += 1
      }

      itemCount += item.qty

      pricedItems.push({
        productId: item.productId,
        slug: product.slug,
        name: product.name,
        modelCode: product.modelCode,
        imageUrl: product.imageUrl,
        categorySlug: product.categorySlug,
        qty: item.qty,
        unitPrice,
        lineTotal,
        available,
        availabilityMode: product.availabilityMode,
        leadTimeText: product.leadTimeText,
      })
    }

    if (pricedItems.length > 0) {
      pricedRooms.push({
        key: room.key,
        subtotal: roomSubtotal,
        items: pricedItems,
      })
      total += roomSubtotal
    }
  }

  return {
    rooms: pricedRooms,
    itemCount,
    total,
    unavailable,
  }
}

export function bridalDeposit(total: number, pct: number): number {
  if (total <= 0 || pct <= 0) {
    return 0
  }
  return Math.round((total * pct) / 100)
}

function getCairoDateParts(d: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = formatter.formatToParts(d)
  let year = 0
  let month = 0
  let day = 0
  for (const p of parts) {
    if (p.type === 'year') year = Number.parseInt(p.value, 10)
    if (p.type === 'month') month = Number.parseInt(p.value, 10)
    if (p.type === 'day') day = Number.parseInt(p.value, 10)
  }
  return { year, month, day }
}

export function cairoToday(now: Date = new Date()): string {
  const { year, month, day } = getCairoDateParts(now)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export interface BridalReserveQuote {
  subtotal: number
  deliveryFee: number
  total: number
  depositPct: number
  depositAmount: number
  lockDays: number
  zoneName: string
}

export function buildBridalReserveQuote(
  priced: PricedRoomsResult,
  zone: { name: string; fee: number },
  settings: { depositPct: number; lockDays: number },
): BridalReserveQuote {
  const subtotal = priced.total
  const deliveryFee = zone.fee
  const total = subtotal + deliveryFee
  const depositPct = settings.depositPct
  const depositAmount = bridalDeposit(total, depositPct)
  const lockDays = settings.lockDays
  const zoneName = zone.name

  return {
    subtotal,
    deliveryFee,
    total,
    depositPct,
    depositAmount,
    lockDays,
    zoneName,
  }
}

function getCairoOffsetMs(utcDate: Date): number {
  const cairoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts = cairoFormatter.formatToParts(utcDate)
  let y = 0
  let m = 0
  let d = 0
  let h = 0
  let min = 0
  let s = 0
  for (const p of parts) {
    if (p.type === 'year') y = Number.parseInt(p.value, 10)
    if (p.type === 'month') m = Number.parseInt(p.value, 10)
    if (p.type === 'day') d = Number.parseInt(p.value, 10)
    if (p.type === 'hour') h = Number.parseInt(p.value, 10) % 24
    if (p.type === 'minute') min = Number.parseInt(p.value, 10)
    if (p.type === 'second') s = Number.parseInt(p.value, 10)
  }
  const asUtc = Date.UTC(y, m - 1, d, h, min, s, utcDate.getUTCMilliseconds())
  return asUtc - utcDate.getTime()
}

export function lockEndDate(from: Date, days: number): Date {
  const { year, month, day } = getCairoDateParts(from)
  const targetCal = new Date(Date.UTC(year, month - 1, day + days))
  const targetY = targetCal.getUTCFullYear()
  const targetM = targetCal.getUTCMonth() + 1
  const targetD = targetCal.getUTCDate()

  const nominalUtc = Date.UTC(targetY, targetM - 1, targetD, 23, 59, 59, 999)
  const approxUtc = new Date(nominalUtc - 2.5 * 3600 * 1000)
  const offsetMs = getCairoOffsetMs(approxUtc)
  return new Date(nominalUtc - offsetMs)
}

export function cairoEndOfDay(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const targetY = Number.parseInt(yearStr ?? '', 10)
  const targetM = Number.parseInt(monthStr ?? '', 10)
  const targetD = Number.parseInt(dayStr ?? '', 10)

  const nominalUtc = Date.UTC(targetY, targetM - 1, targetD, 23, 59, 59, 999)
  const approxUtc = new Date(nominalUtc - 2.5 * 3600 * 1000)
  const offsetMs = getCairoOffsetMs(approxUtc)
  return new Date(nominalUtc - offsetMs)
}

export interface LockStateInput {
  bridalStatus?: BridalStatus | null
  lockedUntil?: Date | string | null
}

export interface LockStateResult {
  expired: boolean
  daysLeft: number | null
}

export function lockState(input: LockStateInput, now: Date): LockStateResult {
  if (input.bridalStatus !== 'locked' || !input.lockedUntil) {
    return { expired: false, daysLeft: null }
  }

  const lockedUntilDate =
    typeof input.lockedUntil === 'string' ? new Date(input.lockedUntil) : input.lockedUntil

  if (Number.isNaN(lockedUntilDate.getTime())) {
    return { expired: false, daysLeft: null }
  }

  const expired = now.getTime() > lockedUntilDate.getTime()

  const nowCairo = getCairoDateParts(now)
  const lockCairo = getCairoDateParts(lockedUntilDate)

  const nowDayMs = Date.UTC(nowCairo.year, nowCairo.month - 1, nowCairo.day)
  const lockDayMs = Date.UTC(lockCairo.year, lockCairo.month - 1, lockCairo.day)

  const diffDays = Math.round((lockDayMs - nowDayMs) / 86_400_000)
  const daysLeft = Math.max(0, diffDays)

  return { expired, daysLeft }
}

export interface BridalTierSummary {
  id: string
  slug: string
  name: string
  highlights: string[]
  roomCount: number
  itemCount: number
  total: number
}

export interface BridalAlternative {
  productId: string
  slug: string
  name: string
  imageUrl: string | null
  price: number
  available: boolean
}

export interface BridalListView {
  mode: 'edit' | 'view'
  editToken?: string
  shareToken: string
  status: BridalStatus
  tier: { id: string; name: string; total: number } | null
  rooms: PricedBridalRoom[]
  itemCount: number
  total: number
  issues: { unavailable: number }
  reservation: {
    no: string
    status: OrderStatus
    bridalStatus: BridalStatus | null
    total: number
    depositAmount: number | null
    paidAmount: number
    lockDays: number | null
    lockedUntil: Date | string | null
  } | null
}

export interface BridalRepriceResult {
  oldTotal: number
  newTotal: number
  difference: number
  lockedUntil: Date | string
  whatsappUrl: string
}

export interface BridalExpiringItem {
  id: string
  no: string
  customerName: string
  lockedUntil: Date | string
  lockDaysLeft: number | null
  lockExpired: boolean
}

export interface AdminBridalTierItem {
  productId: string
  name: string
  modelCode: string
  price: number
  qty: number
  flagged: boolean
}

export interface AdminBridalTierRoom {
  key: BridalRoomKey
  items: AdminBridalTierItem[]
}

export interface AdminBridalTier {
  id: string
  slug: string
  name: string
  highlights: string[]
  rooms: AdminBridalTierRoom[]
  total: number
}
