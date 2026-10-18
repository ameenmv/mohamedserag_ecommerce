import { z } from 'zod'

/**
 * Non-negative integer piastre amount schema.
 */
export const moneySchema = z.number().int().nonnegative()
