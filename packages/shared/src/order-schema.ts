import { z } from 'zod'
import { phoneSchema } from './phone-schema.js'
import { paymentMethodSchema } from './enums-schema.js'
import type { OrderStatus, OrderType, PaymentMethod } from './enums.js'
import { cartQuoteItemInputSchema, mergeCartItems } from './cart-schema.js'

export const orderCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' })
    .max(80, { message: 'الاسم لا يزيد عن 80 حرفاً' }),
  phone: phoneSchema,
  governorate: z
    .string()
    .trim()
    .min(2, { message: 'المحافظة مطلوبة' })
    .max(60, { message: 'اسم المحافظة لا يزيد عن 60 حرفاً' }),
  city: z
    .string()
    .trim()
    .min(2, { message: 'المدينة / المركز مطلوب' })
    .max(60, { message: 'اسم المدينة لا يزيد عن 60 حرفاً' }),
  address: z
    .string()
    .trim()
    .min(5, { message: 'العنوان يجب أن يكون 5 أحرف على الأقل' })
    .max(300, { message: 'العنوان لا يزيد عن 300 حرف' }),
  notes: z
    .string()
    .trim()
    .max(500, { message: 'الملاحظات لا تزيد عن 500 حرف' })
    .optional(),
})
export type OrderCustomerInput = z.infer<typeof orderCustomerSchema>

export const createOrderInputSchema = z.object({
  items: z
    .array(cartQuoteItemInputSchema)
    .min(1, { message: 'سلة التسوق فارغة' })
    .max(50, { message: 'الحد الأقصى لعدد عناصر السلة هو 50' })
    .transform((items) => mergeCartItems(items)),
  customer: orderCustomerSchema,
  paymentMethod: paymentMethodSchema,
  couponCode: z.string().trim().max(40, { message: 'كود الكوبون لا يزيد عن 40 حرفاً' }).optional(),
  idempotencyKey: z
    .string({ message: 'مفتاح منع التكرار مطلوب' })
    .regex(/^[A-Za-z0-9_-]{16,64}$/, { message: 'مفتاح منع التكرار غير صالح' }),
  expectedTotal: z
    .number()
    .int({ message: 'المجموع المتوقع يجب أن يكون عدداً صحيحاً' })
    .min(0, { message: 'المجموع المتوقع يجب أن يكون موجباً' }),
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

export interface CreateOrderResult {
  no: string
  publicToken: string
  status: OrderStatus
  total: number
}

export interface OrderThanksItem {
  name: string
  modelCode: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface OrderThanksPayment {
  name: string
  account: string | null
  hint: string | null
}

export interface OrderThanksDeposit {
  pct: number
  amount: number
}

export interface OrderThanks {
  no: string
  type: OrderType
  status: OrderStatus
  createdAt: Date | string
  paymentMethod: PaymentMethod
  items: OrderThanksItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  deposit: OrderThanksDeposit | null
  payment: OrderThanksPayment
  confirmToken: string | null
  customerFirstName: string
  lockDays: number | null
}
