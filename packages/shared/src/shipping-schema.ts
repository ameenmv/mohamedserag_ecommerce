import { z } from 'zod'
import { SHIPPING_CLASSES } from './shipping.js'

export const shippingClassSchema = z.enum(SHIPPING_CLASSES, {
  message: 'فئة التوصيل غير صحيحة',
})

const feeSchema = z
  .number()
  .int({ message: 'مصاريف التوصيل يجب أن تكون عدداً صحيحاً' })
  .min(0, { message: 'مصاريف التوصيل لا يمكن أن تكون سالبة' })

export const zoneFeesSchema = z.object({
  small: feeSchema,
  medium: feeSchema,
  large: feeSchema,
})
export type ZoneFeesSetting = z.infer<typeof zoneFeesSchema>

const offerClassesSchema = z.array(shippingClassSchema)

export const deliveryOffersSchema = z.object({
  freeAbove: z.object({
    enabled: z.boolean({ message: 'حالة عرض التوصيل المجاني مطلوبة' }),
    amount: z
      .number()
      .int({ message: 'مبلغ التوصيل المجاني يجب أن يكون عدداً صحيحاً' })
      .min(0, { message: 'مبلغ التوصيل المجاني لا يمكن أن يكون سالباً' }),
    classes: offerClassesSchema,
  }),
  firstOrderFree: z.object({
    enabled: z.boolean({ message: 'حالة عرض أول طلب مطلوبة' }),
    classes: offerClassesSchema,
  }),
})
export type DeliveryOffersSetting = z.infer<typeof deliveryOffersSchema>

export const adminZoneFeesSchema = z.object({
  small: z
    .number()
    .int({ message: 'مصاريف التوصيل لازم تكون عدد صحيح' })
    .min(0, { message: 'مصاريف التوصيل مش ممكن تكون سالبة' })
    .max(100_000_000, { message: 'مصاريف التوصيل كبيرة أوي' }),
  medium: z
    .number()
    .int({ message: 'مصاريف التوصيل لازم تكون عدد صحيح' })
    .min(0, { message: 'مصاريف التوصيل مش ممكن تكون سالبة' })
    .max(100_000_000, { message: 'مصاريف التوصيل كبيرة أوي' }),
  large: z
    .number()
    .int({ message: 'مصاريف التوصيل لازم تكون عدد صحيح' })
    .min(0, { message: 'مصاريف التوصيل مش ممكن تكون سالبة' })
    .max(100_000_000, { message: 'مصاريف التوصيل كبيرة أوي' }),
})

export const adminDeliveryOffersSchema = z
  .object({
    freeAbove: z.object({
      enabled: z.boolean({ message: 'حالة عرض التوصيل المجاني مطلوبة' }),
      amount: z
        .number()
        .int({ message: 'مبلغ التوصيل المجاني لازم يكون عدد صحيح' })
        .min(0, { message: 'مبلغ التوصيل المجاني مش ممكن يكون سالب' })
        .max(100_000_000, { message: 'مبلغ التوصيل المجاني كبير أوي' }),
      classes: offerClassesSchema,
    }),
    firstOrderFree: z.object({
      enabled: z.boolean({ message: 'حالة عرض أول طلب مطلوبة' }),
      classes: offerClassesSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.freeAbove.enabled && data.freeAbove.amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['freeAbove', 'amount'],
        message: 'حدد مبلغ أكبر من صفر لعرض التوصيل المجاني',
      })
    }
  })
export type AdminDeliveryOffers = z.infer<typeof adminDeliveryOffersSchema>
