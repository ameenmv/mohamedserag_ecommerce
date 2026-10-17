import { z } from 'zod'
import { normalizePhone, PHONE_ERROR_MESSAGE } from './phone.js'

/**
 * Zod schema that validates and transforms an Egyptian mobile phone string
 * into its normalized `01[0125]XXXXXXXX` form.
 */
export const phoneSchema = z
  .string({ message: PHONE_ERROR_MESSAGE })
  .refine((val) => normalizePhone(val) !== null, {
    message: PHONE_ERROR_MESSAGE,
  })
  .transform((val): string => normalizePhone(val) ?? '')
