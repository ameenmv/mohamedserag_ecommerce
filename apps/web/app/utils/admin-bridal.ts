import {
  BRIDAL_MAX_QTY,
  BRIDAL_ROOM_KEYS,
  cairoToday,
  type AdminBridalTier,
  type AdminBridalTierItem,
  type AdminBridalTierRoom,
  type BridalRoomKey,
  type BridalTierUpdateInput,
} from '@serag/shared'

/**
 * Returns tomorrow's date string in Africa/Cairo (YYYY-MM-DD).
 */
export function cairoTomorrow(now: Date = new Date()): string {
  const tomorrow = new Date(now.getTime() + 86_400_000)
  return cairoToday(tomorrow)
}

/**
 * Deep clones an AdminBridalTier object for safe local mutation in the editor.
 */
export function cloneTier(tier: AdminBridalTier): AdminBridalTier {
  return {
    id: tier.id,
    slug: tier.slug,
    name: tier.name,
    highlights: [...tier.highlights],
    rooms: tier.rooms.map((room) => ({
      key: room.key,
      items: room.items.map((item) => ({ ...item })),
    })),
    total: tier.total,
  }
}

/**
 * Adds a product to a specific room in a tier.
 * If the product already exists in that room, increments its quantity up to BRIDAL_MAX_QTY (10).
 * Otherwise appends it as a new item with quantity 1.
 */
export function addProductToRoom(
  rooms: readonly AdminBridalTierRoom[],
  roomKey: BridalRoomKey,
  product: { id: string; name: string; modelCode: string; price: number; flagged?: boolean },
): AdminBridalTierRoom[] {
  const nextRooms: AdminBridalTierRoom[] = []
  let foundRoom = false

  for (const room of rooms) {
    if (room.key !== roomKey) {
      nextRooms.push({
        key: room.key,
        items: room.items.map((i) => ({ ...i })),
      })
      continue
    }

    foundRoom = true
    const existingIndex = room.items.findIndex((i) => i.productId === product.id)
    const nextItems: AdminBridalTierItem[] = room.items.map((i) => ({ ...i }))

    if (existingIndex >= 0) {
      const existing = nextItems[existingIndex]!
      nextItems[existingIndex] = {
        ...existing,
        qty: Math.min(BRIDAL_MAX_QTY, existing.qty + 1),
      }
    } else {
      nextItems.push({
        productId: product.id,
        name: product.name,
        modelCode: product.modelCode,
        price: product.price,
        qty: 1,
        flagged: product.flagged ?? false,
      })
    }

    nextRooms.push({
      key: room.key,
      items: nextItems,
    })
  }

  if (!foundRoom) {
    nextRooms.push({
      key: roomKey,
      items: [
        {
          productId: product.id,
          name: product.name,
          modelCode: product.modelCode,
          price: product.price,
          qty: 1,
          flagged: product.flagged ?? false,
        },
      ],
    })
  }

  return nextRooms
}

/**
 * Removes a product from a specific room in a tier.
 */
export function removeProductFromRoom(
  rooms: readonly AdminBridalTierRoom[],
  roomKey: BridalRoomKey,
  productId: string,
): AdminBridalTierRoom[] {
  return rooms.map((room) => {
    if (room.key !== roomKey) {
      return {
        key: room.key,
        items: room.items.map((i) => ({ ...i })),
      }
    }
    return {
      key: room.key,
      items: room.items.filter((i) => i.productId !== productId).map((i) => ({ ...i })),
    }
  })
}

/**
 * Updates an item's quantity in a specific room, clamped between 1 and BRIDAL_MAX_QTY (10).
 */
export function updateItemQty(
  rooms: readonly AdminBridalTierRoom[],
  roomKey: BridalRoomKey,
  productId: string,
  qty: number,
): AdminBridalTierRoom[] {
  const safeQty = Math.min(BRIDAL_MAX_QTY, Math.max(1, Math.round(qty) || 1))
  return rooms.map((room) => {
    if (room.key !== roomKey) {
      return {
        key: room.key,
        items: room.items.map((i) => ({ ...i })),
      }
    }
    return {
      key: room.key,
      items: room.items.map((i) => (i.productId === productId ? { ...i, qty: safeQty } : { ...i })),
    }
  })
}

/**
 * Computes the total price of a tier by summing qty * price of all unflagged items across all rooms.
 */
export function computeTierTotal(rooms: readonly AdminBridalTierRoom[]): number {
  let total = 0
  for (const room of rooms) {
    for (const item of room.items) {
      if (!item.flagged) {
        total += item.qty * item.price
      }
    }
  }
  return total
}

/**
 * Appends a new highlight if highlights count is under 4.
 */
export function addHighlight(highlights: readonly string[], text = ''): string[] {
  if (highlights.length >= 4) {
    return [...highlights]
  }
  return [...highlights, text]
}

/**
 * Updates a highlight text at a given index.
 */
export function updateHighlight(
  highlights: readonly string[],
  index: number,
  text: string,
): string[] {
  const next = [...highlights]
  if (index >= 0 && index < next.length) {
    next[index] = text
  }
  return next
}

/**
 * Removes a highlight at a given index.
 */
export function removeHighlight(highlights: readonly string[], index: number): string[] {
  return highlights.filter((_, i) => i !== index)
}

/**
 * Checks whether the current edited tier differs from the original.
 */
export function isTierDirty(original: AdminBridalTier, current: AdminBridalTier): boolean {
  if (original.name.trim() !== current.name.trim()) return true

  const origHighlights = original.highlights.map((h) => h.trim()).filter(Boolean)
  const currHighlights = current.highlights.map((h) => h.trim()).filter(Boolean)
  if (origHighlights.length !== currHighlights.length) return true
  for (let i = 0; i < origHighlights.length; i++) {
    if (origHighlights[i] !== currHighlights[i]) return true
  }

  const origMap = new Map<string, number>()
  for (const room of original.rooms) {
    for (const item of room.items) {
      origMap.set(`${room.key}:${item.productId}`, item.qty)
    }
  }

  const currMap = new Map<string, number>()
  for (const room of current.rooms) {
    for (const item of room.items) {
      currMap.set(`${room.key}:${item.productId}`, item.qty)
    }
  }

  if (origMap.size !== currMap.size) return true
  for (const [key, qty] of origMap.entries()) {
    if (currMap.get(key) !== qty) return true
  }

  return false
}

/**
 * Prepares the payload for PUT /admin/bridal/tiers/:id
 */
export function toTierUpdateInput(tier: AdminBridalTier): BridalTierUpdateInput {
  const roomsMap = new Map<BridalRoomKey, { productId: string; qty: number }[]>()
  for (const r of tier.rooms) {
    if (!BRIDAL_ROOM_KEYS.includes(r.key)) continue
    roomsMap.set(
      r.key,
      r.items.map((i) => ({ productId: i.productId, qty: i.qty })),
    )
  }

  const rooms = BRIDAL_ROOM_KEYS.map((key) => ({
    key,
    items: roomsMap.get(key) ?? [],
  })).filter((r) => r.items.length > 0)

  return {
    name: tier.name.trim(),
    highlights: tier.highlights.map((h) => h.trim()).filter(Boolean).slice(0, 4),
    rooms,
  }
}
