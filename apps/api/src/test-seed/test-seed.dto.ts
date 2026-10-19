import { z } from 'zod'

export const RUN_ID_REGEX = /^[a-z0-9-]{4,40}$/

export const seedProductFlashSaleSchema = z.object({
  salePriceEgp: z.number().positive({ message: 'salePriceEgp must be positive' }),
  startsInMinutes: z.number().optional().default(-1),
  endsInMinutes: z.number().optional().default(60),
})

export type SeedProductFlashSaleInput = z.output<typeof seedProductFlashSaleSchema>

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
  /** Adds one image row (URL only, no file) so the product qualifies for the Merchant feed. */
  withImage: z.boolean().optional(),
  flashSale: seedProductFlashSaleSchema.optional(),
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

export const seedCouponSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
  code: z.string().trim().min(1).optional(),
  type: z.enum(['percent', 'fixed']).optional().default('percent'),
  value: z.number().positive({ message: 'value must be positive' }),
  minOrderEgp: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerPhone: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  categorySlugs: z.array(z.string().trim().min(1)).optional(),
  brandSlugs: z.array(z.string().trim().min(1)).optional(),
  active: z.boolean().optional().default(true),
})

export type SeedCouponInput = z.output<typeof seedCouponSchema>

export const seedReviewSchema = z.object({
  runId: z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' }),
  productId: z.string().min(1, { message: 'productId is required' }),
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  stars: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  verifiedBuyer: z.boolean().optional().default(false),
  reply: z.string().trim().nullable().optional(),
  createdAt: z.string().datetime().optional(),
})

export type SeedReviewInput = z.output<typeof seedReviewSchema>

export const runIdParamSchema = z.string().regex(RUN_ID_REGEX, { message: 'Invalid runId' })

