import { z } from 'zod'
import { phoneSchema } from './phone-schema.js'
import { normalizeCouponCode } from './promotions.js'

export const flashSaleInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'اسم العرض مطلوب')
      .max(80, 'اسم العرض لا يمكن أن يتجاوز 80 حرف'),
    startsAt: z.string().datetime({ message: 'تاريخ بداية العرض غير صالح' }),
    endsAt: z.string().datetime({ message: 'تاريخ نهاية العرض غير صالح' }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'معرف المنتج مطلوب'),
          salePrice: z.number().int().positive('سعر العرض يجب أن يكون أكبر من صفر'),
        }),
      )
      .min(1, 'يجب إضافة منتج واحد على الأقل في العرض')
      .max(100, 'الحد الأقصى للمنتجات في العرض هو 100 منتج'),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startsAt).getTime()
    const end = new Date(data.endsAt).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية',
        path: ['endsAt'],
      })
    }

    const seenProductIds = new Set<string>()
    for (let i = 0; i < data.items.length; i++) {
      const pid = data.items[i]?.productId
      if (!pid) continue
      if (seenProductIds.has(pid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'لا يمكن تكرار نفس المنتج في العرض',
          path: ['items', i, 'productId'],
        })
      }
      seenProductIds.add(pid)
    }
  })

export type FlashSaleInput = z.infer<typeof flashSaleInputSchema>

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .transform((val) => normalizeCouponCode(val))
      .pipe(
        z
          .string()
          .min(3, 'كود الخصم يجب أن يتكون من 3 أحرف على الأقل')
          .max(20, 'كود الخصم لا يتجاوز 20 حرف')
          .regex(/^[A-Z0-9_-]+$/, 'كود الخصم يجب أن يحتوي على حروف وأرقام إنجليزية وشرطات فقط'),
      ),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int(),
    minOrder: z.number().int().min(0, 'الحد الأدنى للطلب يجب أن يكون صفر أو أكثر').default(0),
    startsAt: z.string().datetime({ message: 'تاريخ بداية الكوبون غير صالح' }).nullable().optional(),
    endsAt: z.string().datetime({ message: 'تاريخ نهاية الكوبون غير صالح' }).nullable().optional(),
    maxUses: z
      .number()
      .int()
      .min(1, 'الحد الأقصى لعدد الاستخدامات يجب أن يكون 1 على الأقل')
      .nullable()
      .optional(),
    maxUsesPerPhone: z
      .number()
      .int()
      .min(1, 'الحد الأقصى للاستخدام لكل رقم هاتف يجب أن يكون 1 على الأقل')
      .nullable()
      .optional(),
    categoryIds: z.array(z.string()).default([]),
    brandIds: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'percent') {
      if (data.value < 1 || data.value > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'نسبة الخصم يجب أن تكون بين 1 و 90%',
          path: ['value'],
        })
      }
    } else if (data.type === 'fixed') {
      if (data.value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'قيمة الخصم الثابت يجب أن تكون أكبر من صفر',
          path: ['value'],
        })
      }
    }

    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt).getTime()
      const end = new Date(data.endsAt).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'تاريخ نهاية الكوبون يجب أن يكون بعد تاريخ البداية',
          path: ['endsAt'],
        })
      }
    }
  })

export type CouponInput = z.infer<typeof couponInputSchema>

export const notifyMeInputSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  name: z
    .string()
    .trim()
    .min(2, 'الاسم يجب أن يتكون من حرفين على الأقل')
    .max(60, 'الاسم لا يتجاوز 60 حرف'),
  phone: phoneSchema,
  website: z.string().optional(),
})

export type NotifyMeInput = z.infer<typeof notifyMeInputSchema>

export const adminFlashSaleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى لحجم الصفحة 1')
    .max(100, 'الحد الأقصى لحجم الصفحة 100')
    .default(20),
  q: z.string().trim().max(80).optional(),
})

export type AdminFlashSaleListQueryInput = z.input<typeof adminFlashSaleListQuerySchema>
export type AdminFlashSaleListQueryOutput = z.output<typeof adminFlashSaleListQuerySchema>

export const adminCouponListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى لحجم الصفحة 1')
    .max(100, 'الحد الأقصى لحجم الصفحة 100')
    .default(20),
  q: z.string().trim().max(60).optional(),
})

export type AdminCouponListQueryInput = z.input<typeof adminCouponListQuerySchema>
export type AdminCouponListQueryOutput = z.output<typeof adminCouponListQuerySchema>
