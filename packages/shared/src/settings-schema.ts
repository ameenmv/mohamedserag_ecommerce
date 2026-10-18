import { z } from 'zod'
import { paymentMethodSchema } from './enums.js'

export const zonePlaceSchema = z.object({
  governorate: z.string().trim().min(1, { message: 'اسم المحافظة مطلوب' }),
  city: z.string().trim().min(1).optional(),
})
export type ZonePlaceSetting = z.infer<typeof zonePlaceSchema>

export const zoneSchema = z.object({
  id: z.string().min(1, { message: 'معرف المنطقة مطلوب' }),
  name: z.string().min(1, { message: 'اسم المنطقة مطلوب' }),
  fee: z
    .number()
    .int({ message: 'مصاريف التوصيل يجب أن تكون عدداً صحيحاً' })
    .min(0, { message: 'مصاريف التوصيل لا يمكن أن تكون سالبة' }),
  places: z.array(zonePlaceSchema),
})
export type ZoneSetting = z.infer<typeof zoneSchema>

export const zonesSchema = z.array(zoneSchema)
export type ZonesSetting = z.infer<typeof zonesSchema>

export const codDepositSchema = z.object({
  threshold: z
    .number()
    .int({ message: 'حد العربون يجب أن يكون عدداً صحيحاً' })
    .min(0, { message: 'حد العربون لا يمكن أن يكون سالباً' }),
  pct: z
    .number()
    .min(0, { message: 'نسبة العربون لا يمكن أن تكون سالبة' })
    .max(100, { message: 'نسبة العربون لا تزيد عن 100%' }),
})
export type CodDepositSetting = z.infer<typeof codDepositSchema>

export const DEFAULT_COD_DEPOSIT: CodDepositSetting = {
  threshold: 3_000_000,
  pct: 10,
}

export const paymentMethodSettingSchema = z.object({
  enabled: z.boolean({ message: 'حالة طريقة الدفع مطلوبة' }),
  name: z.string().min(1, { message: 'اسم طريقة الدفع مطلوب' }),
  account: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
})
export type PaymentMethodSetting = z.infer<typeof paymentMethodSettingSchema>

export const paymentsSettingSchema = z.object({
  methods: z.record(paymentMethodSchema, paymentMethodSettingSchema),
})
export type PaymentsSetting = z.infer<typeof paymentsSettingSchema>

export const DEFAULT_PAYMENTS: PaymentsSetting = {
  methods: {
    cod: {
      enabled: true,
      name: 'الدفع عند الاستلام',
      hint: 'ادفع نقداً عند استلام ومعاينة الجهاز',
    },
    instapay: {
      enabled: false,
      name: 'إنستا باي',
    },
    vodafone_cash: {
      enabled: false,
      name: 'فودافون كاش',
    },
    fawry: {
      enabled: false,
      name: 'فوري',
    },
  },
}

export const checkoutPaymentMethodSchema = z.object({
  method: paymentMethodSchema,
  name: z.string(),
  hint: z.string().nullable(),
  account: z.string().nullable(),
})
export type CheckoutPaymentMethod = z.infer<typeof checkoutPaymentMethodSchema>

export const checkoutSettingsSchema = z.object({
  paymentMethods: z.array(checkoutPaymentMethodSchema),
  codDeposit: codDepositSchema,
  storeWhatsapp: z.string().optional(),
  governorates: z.array(z.string()),
  citySuggestions: z.record(z.string(), z.array(z.string())),
})
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>
