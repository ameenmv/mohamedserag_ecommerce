import { z } from 'zod'
import { paymentMethodSchema } from './enums-schema.js'
import { normalizePhone, PHONE_ERROR_MESSAGE } from './phone.js'
import { EGYPT_GOVERNORATES } from './governorates.js'
import type { WhatsAppTemplateKey } from './whatsapp.js'
import { unknownTemplateVariables, TEMPLATE_VARIABLES, type SettingsSection } from './settings.js'

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

// ---------------------------------------------------------------------------
// Admin settings schemas (Slice 7)
// ---------------------------------------------------------------------------

const INTERNATIONAL_PHONE_RE = /^\+\d{8,15}$/

/**
 * Admin phone field: an Egyptian mobile (normalized to its 11 digits), an
 * international number (`+` prefix), or a placeholder still containing `[`.
 */
export const settingsPhoneSchema = z
  .string({ message: PHONE_ERROR_MESSAGE })
  .trim()
  .refine(
    (value) => {
      if (value.includes('[')) return true
      if (INTERNATIONAL_PHONE_RE.test(value)) return true
      return normalizePhone(value) !== null
    },
    { message: PHONE_ERROR_MESSAGE },
  )
  .transform((value): string => {
    if (value.includes('[') || INTERNATIONAL_PHONE_RE.test(value)) return value
    return normalizePhone(value) ?? value
  })

export const storeInfoSettingSchema = z.object({
  name: z
    .string({ message: 'اسم المعرض مطلوب' })
    .trim()
    .min(1, { message: 'اسم المعرض مطلوب' })
    .max(80, { message: 'اسم المعرض بيزيد عن 80 حرف' }),
  phone: settingsPhoneSchema,
  whatsapp: settingsPhoneSchema,
  tradersWhatsapp: z
    .union([settingsPhoneSchema, z.literal('')])
    .optional()
    .transform((value) => value ?? ''),
  address: z
    .string({ message: 'العنوان مش صحيح' })
    .trim()
    .max(200, { message: 'العنوان بيزيد عن 200 حرف' }),
  hours: z
    .string({ message: 'مواعيد العمل مش صحيحة' })
    .trim()
    .max(120, { message: 'مواعيد العمل بتزيد عن 120 حرف' }),
})
export type StoreInfoSettingInput = z.input<typeof storeInfoSettingSchema>
export type StoreInfoSettingOutput = z.output<typeof storeInfoSettingSchema>

const paymentMethodAdminSchema = z.object({
  enabled: z.boolean({ message: 'حالة طريقة الدفع مطلوبة' }),
  name: z
    .string({ message: 'اسم طريقة الدفع مطلوب' })
    .trim()
    .min(1, { message: 'اسم طريقة الدفع مطلوب' })
    .max(40, { message: 'اسم طريقة الدفع بيزيد عن 40 حرف' }),
  account: z
    .string({ message: 'بيانات الحساب مش صحيحة' })
    .trim()
    .max(300, { message: 'بيانات الحساب بتزيد عن 300 حرف' })
    .nullable()
    .optional(),
  hint: z
    .string({ message: 'ملاحظة الدفع مش صحيحة' })
    .trim()
    .max(300, { message: 'ملاحظة الدفع بتزيد عن 300 حرف' })
    .nullable()
    .optional(),
})

export const adminPaymentsSettingSchema = z
  .object({
    methods: z.record(paymentMethodSchema, paymentMethodAdminSchema),
  })
  .refine(
    (data) => Object.values(data.methods).some((method) => method.enabled),
    { message: 'لازم طريقة دفع واحدة على الأقل تكون مفعّلة', path: ['methods'] },
  )
export type AdminPaymentsSetting = z.infer<typeof adminPaymentsSettingSchema>

const adminZonePlaceSchema = z.object({
  governorate: z
    .string({ message: 'اسم المحافظة مطلوب' })
    .trim()
    .refine((value) => EGYPT_GOVERNORATES.includes(value), {
      message: 'المحافظة مش من محافظات مصر',
    }),
  city: z.string().trim().min(1).optional(),
})

const adminZoneSchema = z.object({
  id: z.string().min(1, { message: 'معرف المنطقة مطلوب' }),
  name: z
    .string()
    .trim()
    .min(1, { message: 'اسم المنطقة مطلوب' })
    .max(40, { message: 'اسم المنطقة بيزيد عن 40 حرف' }),
  fee: z
    .number()
    .int({ message: 'مصاريف التوصيل لازم تكون عدد صحيح' })
    .min(0, { message: 'مصاريف التوصيل مش ممكن تكون سالبة' })
    .max(100_000_000, { message: 'مصاريف التوصيل كبيرة أوي' }),
  /** Empty places = the catch-all zone for every place no other zone covers (at most one). */
  places: z.array(adminZonePlaceSchema),
})

export const adminZonesSettingSchema = z
  .array(adminZoneSchema)
  .min(1, { message: 'لازم منطقة توصيل واحدة على الأقل' })
  .max(30, { message: 'عدد المناطق بيزيد عن 30' })
  .superRefine((zones, ctx) => {
    const zoneIds = new Set<string>()
    const wholeGovernorates = new Set<string>()
    const governorateCity = new Set<string>()
    let catchAllSeen = false

    zones.forEach((zone, index) => {
      if (zone.places.length === 0) {
        if (catchAllSeen) {
          ctx.addIssue({
            code: 'custom',
            message: 'مينفعش أكتر من منطقة واحدة لباقي الأماكن (من غير محافظات)',
            path: [index, 'places'],
          })
        }
        catchAllSeen = true
      }

      if (zoneIds.has(zone.id)) {
        ctx.addIssue({
          code: 'custom',
          message: 'معرف المنطقة مكرر',
          path: [index, 'id'],
        })
      }
      zoneIds.add(zone.id)

      zone.places.forEach((place) => {
        const city = place.city?.trim()
        if (city === undefined || city === '') {
          if (wholeGovernorates.has(place.governorate)) {
            ctx.addIssue({
              code: 'custom',
              message: 'المحافظة دي موجودة في منطقة تانية',
              path: [index, 'places'],
            })
          }
          wholeGovernorates.add(place.governorate)
          return
        }

        const pair = `${place.governorate}\u0000${city}`
        if (governorateCity.has(pair)) {
          ctx.addIssue({
            code: 'custom',
            message: 'نفس المحافظة والمدينة موجودين في منطقة تانية',
            path: [index, 'places'],
          })
        }
        governorateCity.add(pair)
      })
    })
  })
export type AdminZonesSetting = z.infer<typeof adminZonesSettingSchema>

export const adminCodDepositSchema = z.object({
  threshold: z
    .number()
    .int({ message: 'حد العربون لازم يكون عدد صحيح' })
    .positive({ message: 'حد العربون لازم يكون أكبر من صفر' }),
  pct: z
    .number()
    .int({ message: 'نسبة العربون لازم تكون عدد صحيح' })
    .min(1, { message: 'نسبة العربون لازم تكون من 1 لـ 100' })
    .max(100, { message: 'نسبة العربون لازم تكون من 1 لـ 100' }),
})
export type AdminCodDeposit = z.infer<typeof adminCodDepositSchema>

export const lowStockSettingSchema = z.object({
  defaultThreshold: z
    .number()
    .int({ message: 'الحد الافتراضي لازم يكون عدد صحيح' })
    .min(0, { message: 'الحد الافتراضي لازم يكون من 0 لـ 999' })
    .max(999, { message: 'الحد الافتراضي لازم يكون من 0 لـ 999' }),
})
export type LowStockSettingInput = z.infer<typeof lowStockSettingSchema>

const synonymWordSchema = z
  .string({ message: 'الكلمة مش صحيحة' })
  .trim()
  .min(1, { message: 'الكلمة مش ممكن تكون فاضية' })
  .max(40, { message: 'الكلمة بتزيد عن 40 حرف' })

export const searchSynonymsSettingSchema = z
  .array(
    z
      .array(synonymWordSchema)
      .min(2, { message: 'كل مجموعة لازم يكون فيها كلمتين على الأقل' })
      .max(10, { message: 'كل مجموعة بحد أقصى 10 كلمات' })
      .refine((words) => new Set(words).size === words.length, {
        message: 'فيه كلمات مكررة في المجموعة',
      }),
  )
  .max(200, { message: 'عدد المجموعات بيزيد عن 200' })
export type SearchSynonymsSettingInput = z.infer<typeof searchSynonymsSettingSchema>

/** Every WhatsApp template key, in display order. */
export const TEMPLATE_KEYS = [
  'order_confirmed',
  'order_out_for_delivery',
  'order_delivered',
  'order_cancelled',
  'payment_rejected',
  'payment_proof',
  'bridal_locked',
  'bridal_repriced',
  'notify_back_in_stock',
  'product_question',
  'traders_contact',
] as const satisfies readonly WhatsAppTemplateKey[]

const templateTextSchema = z
  .string({ message: 'نص القالب مطلوب' })
  .min(1, { message: 'نص القالب مش ممكن يكون فاضي' })
  .max(1000, { message: 'نص القالب بيزيد عن 1000 حرف' })

export const templatesSettingSchema = z
  .object({
    order_confirmed: templateTextSchema,
    order_out_for_delivery: templateTextSchema,
    order_delivered: templateTextSchema,
    order_cancelled: templateTextSchema,
    payment_rejected: templateTextSchema,
    payment_proof: templateTextSchema,
    bridal_locked: templateTextSchema,
    bridal_repriced: templateTextSchema,
    notify_back_in_stock: templateTextSchema,
    product_question: templateTextSchema,
    traders_contact: templateTextSchema,
  })
  .superRefine((templates, ctx) => {
    for (const key of TEMPLATE_KEYS) {
      const unknown = unknownTemplateVariables(key, templates[key])
      if (unknown.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `متغيرات غير مسموح بها: ${unknown.join('، ')}. المتغيرات المسموح بها: ${TEMPLATE_VARIABLES[key].join('، ')}`,
          path: [key],
        })
      }
    }
  })
export type TemplatesSettingInput = z.infer<typeof templatesSettingSchema>

export const templatePreviewInputSchema = z.object({
  key: z.enum(TEMPLATE_KEYS, { message: 'القالب مش صحيح' }),
  template: templateTextSchema,
})
export type TemplatePreviewInput = z.infer<typeof templatePreviewInputSchema>

export const SETTINGS_SECTION_SCHEMAS: Record<SettingsSection, z.ZodType> = {
  store: storeInfoSettingSchema,
  payments: adminPaymentsSettingSchema,
  zones: adminZonesSettingSchema,
  codDeposit: adminCodDepositSchema,
  lowStock: lowStockSettingSchema,
  searchSynonyms: searchSynonymsSettingSchema,
  templates: templatesSettingSchema,
}

export const settingsUpdateSchema = z.object({
  value: z.unknown(),
  version: z.string().nullable(),
})
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>

