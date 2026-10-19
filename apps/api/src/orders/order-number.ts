import type { Prisma } from '../generated/prisma/client.js'

/**
 * Generates the next sequential order number within a transaction.
 * Pattern: SR-<YYYY>-<6 digits>, e.g. SR-2026-000001
 */
export async function nextOrderNo(tx: Prisma.TransactionClient): Promise<string> {
  const seq = await tx.$queryRaw<Array<{ nextval: bigint | number | string }>>`SELECT nextval('order_no_seq')`
  const rawNextVal = seq[0]?.nextval
  if (rawNextVal === undefined) {
    throw new Error('Failed to read next value from order_no_seq')
  }
  return `SR-${new Date().getFullYear()}-${String(Number(rawNextVal)).padStart(6, '0')}`
}
