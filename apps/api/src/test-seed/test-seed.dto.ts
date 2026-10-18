import { z } from 'zod'

export const RUN_ID_REGEX = /^[a-z0-9-]{4,40}$/

export const seedProductSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
  name: z.string().trim().min(1).optional(),
  categorySlug: z.string().trim().min(1).optional(),
  brandSlug: z.string().trim().min(1).optional(),
  priceEgp: z.number().positive().optional(),
  oldPriceEgp: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  availabilityMode: z.enum(['auto', 'on_request', 'out']).optional(),
  leadTimeText: z.string().trim().optional(),
  visible: z.boolean().optional(),
})

export type SeedProductInput = z.output<typeof seedProductSchema>

export const seedOrderSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, { message: 'productId is required' }),
        qty: z.number().int().positive({ message: 'qty must be positive' }),
      }),
    )
    .min(1, { message: 'Order must have at least one item' }),
  paymentMethod: z.enum(['cod', 'instapay', 'vodafone_cash', 'fawry']),
  status: z
    .enum([
      'new',
      'awaiting_payment',
      'awaiting_deposit',
      'payment_rejected',
      'confirmed',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ])
    .optional(),
  governorate: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
})

export type SeedOrderInput = z.output<typeof seedOrderSchema>

export const seedAdminSessionSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
})

export type SeedAdminSessionInput = z.output<typeof seedAdminSessionSchema>

export const seedFlashSaleSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
  name: z.string().trim().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, { message: 'productId is required' }),
        salePriceEgp: z.number().positive({ message: 'salePriceEgp must be positive' }),
      }),
    )
    .min(1, { message: 'Flash sale must have at least one item' }),
})

export type SeedFlashSaleInput = z.output<typeof seedFlashSaleSchema>

export const runIdParamSchema = z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' })
