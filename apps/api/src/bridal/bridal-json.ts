import type { BridalRooms } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'

/** Plain JSON copy of bridal rooms for the `rooms` jsonb columns (no casts needed). */
export function roomsToJson(rooms: BridalRooms): Prisma.InputJsonArray {
  return rooms.map((room) => ({
    key: room.key,
    items: room.items.map((item) => ({ productId: item.productId, qty: item.qty })),
  }))
}
