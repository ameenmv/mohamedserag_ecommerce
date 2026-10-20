import type {
  BridalListView,
  BridalReserveQuote,
  BridalRoom,
  BridalRoomKey,
  BridalRooms,
} from '@serag/shared'
import {
  BRIDAL_MAX_QTY,
  BRIDAL_ROOM_KEYS,
  addItemToRooms,
  normalizeRooms,
  roomForCategory,
} from '@serag/shared'

export interface PriceIndexEntry {
  unitPrice: number
  available: boolean
}

export type PriceIndex = Record<string, PriceIndexEntry>

export interface EstimatedTotals {
  total: number
  itemCount: number
  unavailable: number
  roomSubtotals: Record<BridalRoomKey, number>
}

/**
 * Converts a server-provided BridalListView back into client BridalRooms.
 */
export function toRooms(view: BridalListView): BridalRooms {
  const rooms: BridalRoom[] = []
  for (const r of view.rooms) {
    if (r.items.length > 0) {
      rooms.push({
        key: r.key,
        items: r.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      })
    }
  }
  return normalizeRooms(rooms)
}

/**
 * Updates the quantity for a single product in a given room.
 * Clamps quantity to 1..BRIDAL_MAX_QTY.
 */
export function applyQty(
  rooms: readonly BridalRoom[],
  roomKey: BridalRoomKey,
  productId: string,
  qty: number,
): BridalRooms {
  const validQty = Math.max(1, Math.min(BRIDAL_MAX_QTY, Math.floor(qty) || 1))
  const cloned: BridalRoom[] = rooms.map((r) => ({
    key: r.key,
    items: r.items.map((i) =>
      r.key === roomKey && i.productId === productId
        ? { productId: i.productId, qty: validQty }
        : { productId: i.productId, qty: i.qty },
    ),
  }))
  return normalizeRooms(cloned)
}

/**
 * Removes an item from the specified room and drops empty rooms.
 */
export function removeItem(
  rooms: readonly BridalRoom[],
  roomKey: BridalRoomKey,
  productId: string,
): BridalRooms {
  const cloned: BridalRoom[] = rooms.map((r) => ({
    key: r.key,
    items:
      r.key === roomKey
        ? r.items.filter((i) => i.productId !== productId)
        : r.items.map((i) => ({ productId: i.productId, qty: i.qty })),
  }))
  return normalizeRooms(cloned)
}

/**
 * Swaps `fromId` with `toId` in `roomKey`, keeping the current item's quantity.
 * If `toId` is already present in `roomKey`, quantities merge and cap at BRIDAL_MAX_QTY.
 */
export function swapItem(
  rooms: readonly BridalRoom[],
  roomKey: BridalRoomKey,
  fromId: string,
  toId: string,
): BridalRooms {
  const room = rooms.find((r) => r.key === roomKey)
  if (!room) {
    return normalizeRooms(rooms)
  }

  const existingItem = room.items.find((i) => i.productId === fromId)
  if (!existingItem) {
    return normalizeRooms(rooms)
  }

  const keptQty = existingItem.qty

  const cloned: BridalRoom[] = rooms.map((r) => {
    if (r.key !== roomKey) {
      return {
        key: r.key,
        items: r.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      }
    }

    const remainingItems = r.items
      .filter((i) => i.productId !== fromId)
      .map((i) => ({ productId: i.productId, qty: i.qty }))

    remainingItems.push({ productId: toId, qty: keptQty })

    return {
      key: r.key,
      items: remainingItems,
    }
  })

  return normalizeRooms(cloned)
}

/**
 * Estimates totals locally from a known priceIndex while debounced saves are in-flight.
 * Unknown products count as 0 until the server view confirms their prices.
 */
export function estimateTotals(
  rooms: readonly BridalRoom[],
  priceIndex: PriceIndex,
): EstimatedTotals {
  let total = 0
  let itemCount = 0
  let unavailable = 0
  const roomSubtotals: Record<BridalRoomKey, number> = {
    kitchen: 0,
    laundry: 0,
    living: 0,
    bedrooms: 0,
    small_appliances: 0,
    kitchenware: 0,
  }

  for (const room of rooms) {
    let subtotal = 0
    for (const item of room.items) {
      itemCount += item.qty
      const info = priceIndex[item.productId]
      if (info) {
        if (info.available) {
          const line = info.unitPrice * item.qty
          subtotal += line
          total += line
        } else {
          unavailable += 1
        }
      }
    }
    if (BRIDAL_ROOM_KEYS.includes(room.key)) {
      roomSubtotals[room.key] = subtotal
    }
  }

  return { total, itemCount, unavailable, roomSubtotals }
}

/**
 * Builds a WhatsApp share link without a recipient phone number,
 * opening WhatsApp's contact picker.
 */
export function waShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export type DiffClassification = 'more' | 'less' | 'same'

/**
 * Classifies a price difference:
 * - 'more' if diff > 0
 * - 'less' if diff < 0
 * - 'same' if diff === 0
 */
export function classifyDiff(diff: number): DiffClassification {
  if (diff > 0) return 'more'
  if (diff < 0) return 'less'
  return 'same'
}

export interface BridalConflictResult {
  code: 'PRICE_CHANGED' | 'UNAVAILABLE' | 'NOT_DRAFT' | string
  message: string
  quote?: BridalReserveQuote
}

/**
 * Extracts and validates a 409 Conflict error payload from a failed bridal reservation.
 * Handles both $fetch { data } and { response: { _data } } shapes.
 */
export function parseBridalConflict(error: unknown): BridalConflictResult | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  let payload: unknown = error
  if ('data' in error && error.data && typeof error.data === 'object') {
    payload = error.data
  } else if (
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    '_data' in error.response
  ) {
    payload = (error.response as { _data: unknown })._data
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const p = payload as { code?: unknown; message?: unknown; quote?: unknown }
  if (typeof p.code === 'string') {
    const message =
      typeof p.message === 'string'
        ? p.message
        : Array.isArray(p.message) && typeof p.message[0] === 'string'
          ? p.message[0]
          : ''
    return {
      code: p.code,
      message,
      quote: (p.quote as BridalReserveQuote | undefined) ?? undefined,
    }
  }

  return null
}

/**
 * Determines if a fetched bridal list view can have products appended to it.
 * Must be in 'edit' mode and 'draft' status.
 */
export function canAppendToBridalList(
  view: BridalListView | null | undefined,
): boolean {
  return Boolean(view && view.mode === 'edit' && view.status === 'draft')
}

/**
 * Adds a product to the appropriate room according to its category slug.
 * Uses shared roomForCategory to pick the room and addItemToRooms to handle insertion / quantity merging.
 */
export function addCategoryProductToRooms(
  rooms: readonly BridalRoom[],
  categorySlug: string | null | undefined,
  productId: string,
  qty = 1,
): BridalRoom[] {
  const roomKey = roomForCategory(categorySlug)
  return addItemToRooms(rooms, roomKey, productId, qty)
}

/**
 * Checks if an API error from fetching or patching a bridal list is recoverable
 * by falling through to creating a fresh list (specifically 404 Not Found or 409 Conflict).
 */
export function isRecoverableBridalError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const errObj = error as Record<string, unknown>
  const status =
    (typeof errObj.status === 'number' ? errObj.status : null) ??
    (typeof errObj.statusCode === 'number' ? errObj.statusCode : null) ??
    (errObj.response &&
    typeof errObj.response === 'object' &&
    'status' in errObj.response &&
    typeof (errObj.response as Record<string, unknown>).status === 'number'
      ? ((errObj.response as Record<string, unknown>).status as number)
      : null)

  return status === 404 || status === 409
}

