import { z } from 'zod'
import {
  BRIDAL_MAX_LIST_ITEMS,
  BRIDAL_MAX_QTY,
  BRIDAL_MAX_ROOM_ITEMS,
  BRIDAL_ROOM_KEYS,
  cairoToday,
  normalizeRooms,
  type BridalRooms,
} from './bridal.js'
import { orderCustomerSchema } from './order-schema.js'

export const bridalRoomItemInputSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'معرف المنتج مطلوب')
    .max(40, 'معرف المنتج لا يتجاوز 40 حرفاً'),
  qty: z
    .number()
    .int('الكمية يجب أن تكون عدداً صحيحاً')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(BRIDAL_MAX_QTY, `الحد الأقصى للكمية هو ${BRIDAL_MAX_QTY}`),
})

export const bridalRoomInputSchema = z.object({
  key: z.enum(BRIDAL_ROOM_KEYS, {
    message: 'قسم الغرفة غير صالح',
  }),
  items: z
    .array(bridalRoomItemInputSchema)
    .max(BRIDAL_MAX_ROOM_ITEMS, `الحد الأقصى لعدد عناصر الغرفة هو ${BRIDAL_MAX_ROOM_ITEMS}`),
})

export const bridalRoomsSchema = z
  .array(bridalRoomInputSchema)
  .max(6, 'الحد الأقصى لعدد الغرف هو 6')
  .refine(
    (rooms) => rooms.reduce((sum, r) => sum + r.items.length, 0) <= BRIDAL_MAX_LIST_ITEMS,
    {
      message: `الحد الأقصى لإجمالي عناصر القائمة هو ${BRIDAL_MAX_LIST_ITEMS}`,
    },
  )
  .transform((rooms) => normalizeRooms(rooms))

export function parseStoredRooms(value: unknown): BridalRooms {
  const parsed = bridalRoomsSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

export const createBridalListSchema = z
  .object({
    tierId: z.string().trim().min(1).optional(),
    productId: z.string().trim().min(1).optional(),
  })
  .refine((data) => !(data.tierId && data.productId), {
    message: 'لا يمكن اختيار باقة ومنتج في نفس الوقت',
  })

export type CreateBridalListInput = z.infer<typeof createBridalListSchema>

export const saveBridalListSchema = z.object({
  rooms: bridalRoomsSchema,
})

export type SaveBridalListInput = z.infer<typeof saveBridalListSchema>

export const bridalSettingsSchema = z.object({
  depositPct: z
    .number()
    .int('نسبة العربون يجب أن تكون عدداً صحيحاً')
    .min(1, 'نسبة العربون يجب أن تكون 1% على الأقل')
    .max(50, 'نسبة العربون لا تزيد عن 50%'),
  lockDays: z
    .number()
    .int('مدة التثبيت يجب أن تكون عدداً صحيحاً')
    .min(7, 'مدة التثبيت 7 أيام على الأقل')
    .max(180, 'مدة التثبيت لا تزيد عن 180 يوماً'),
})

export type BridalSettings = z.infer<typeof bridalSettingsSchema>

export const bridalTierUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'اسم الباقة مطلوب')
    .max(40, 'اسم الباقة لا يزيد عن 40 حرفاً'),
  highlights: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'الميزة لا يمكن أن تكون فارغة')
        .max(60, 'الميزة لا تزيد عن 60 حرفاً'),
    )
    .max(4, 'الحد الأقصى للميزات هو 4'),
  rooms: bridalRoomsSchema,
})

export type BridalTierUpdateInput = z.infer<typeof bridalTierUpdateSchema>

export const bridalTokenSchema = z
  .string()
  .trim()
  .min(20, 'الرمز قصير جداً')
  .max(64, 'الرمز طويل جداً')
  .regex(/^[A-Za-z0-9_-]+$/, 'رمز غير صالح')

export const bridalAlternativesQuerySchema = z.object({
  productId: z.string().trim().min(1, 'معرف المنتج مطلوب'),
})

export type BridalAlternativesQuery = z.infer<typeof bridalAlternativesQuerySchema>

export const bridalReservePaymentMethodSchema = z.enum(
  ['instapay', 'vodafone_cash', 'fawry'],
  { message: 'طريقة الدفع غير صالحة' },
)

export type BridalReservePaymentMethod = z.infer<typeof bridalReservePaymentMethodSchema>

export const bridalPreferredDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ غير صالحة (YYYY-MM-DD)' })
  .refine((val) => val >= cairoToday(), {
    message: 'تاريخ التوصيل المفضل لا يمكن أن يكون في الماضي',
  })
  .optional()

export const bridalReserveSchema = z.object({
  customer: orderCustomerSchema,
  preferredDate: bridalPreferredDateSchema,
  paymentMethod: bridalReservePaymentMethodSchema,
  idempotencyKey: z
    .string({ message: 'مفتاح منع التكرار مطلوب' })
    .uuid({ message: 'مفتاح منع التكرار غير صالح' }),
  expectedTotal: z
    .number()
    .int({ message: 'المجموع المتوقع يجب أن يكون عدداً صحيحاً' })
    .min(0, { message: 'المجموع المتوقع يجب أن يكون موجباً' }),
})

export type BridalReserveInput = z.infer<typeof bridalReserveSchema>

export const bridalReserveQuoteQuerySchema = z.object({
  governorate: orderCustomerSchema.shape.governorate,
  city: orderCustomerSchema.shape.city,
})

export type BridalReserveQuoteQuery = z.infer<typeof bridalReserveQuoteQuerySchema>

export const bridalDeliveryDateSchema = z.object({
  date: z
    .string({ message: 'تاريخ التوصيل مطلوب' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ غير صالحة (YYYY-MM-DD)' })
    .refine((val) => val >= cairoToday(), {
      message: 'تاريخ التوصيل لا يمكن أن يكون في الماضي',
    }),
})

export type BridalDeliveryDateInput = z.infer<typeof bridalDeliveryDateSchema>

export const bridalLockExtendSchema = z.object({
  until: z
    .string({ message: 'تاريخ تمديد التثبيت مطلوب' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ غير صالحة (YYYY-MM-DD)' })
    .refine((val) => val > cairoToday(), {
      message: 'تاريخ تمديد التثبيت يجب أن يكون بعد تاريخ اليوم',
    }),
})

export type BridalLockExtendInput = z.infer<typeof bridalLockExtendSchema>
