import { normalizePhone } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import type { PrismaService } from '../prisma/prisma.service.js'

/**
 * True when the normalized phone has no earlier non-cancelled order.
 * Unknown/invalid phones return `null` so the first-order offer is never applied.
 */
export async function isFirstOrderForPhone(
  db: PrismaService | Prisma.TransactionClient,
  phone: string | null | undefined,
): Promise<boolean | null> {
  const normalized = phone ? normalizePhone(phone) : null
  if (!normalized) return null

  const count = await db.order.count({
    where: {
      customerPhone: normalized,
      type: 'order',
      status: { not: 'cancelled' },
    },
  })

  return count === 0
}
