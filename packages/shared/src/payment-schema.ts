import { z } from 'zod'
import { orderStatusSchema, type OrderStatus } from './enums.js'

export const confirmPaymentInputSchema = z.object({
  amount: z
    .number()
    .int({ message: 'المبلغ يجب أن يكون عدداً صحيحاً' })
    .positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  note: z
    .string()
    .trim()
    .max(300, { message: 'الملاحظة لا تزيد عن 300 حرف' })
    .optional(),
})
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentInputSchema>

export const rejectPaymentInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { message: 'سبب الرفض يجب أن يكون 3 أحرف على الأقل' })
    .max(300, { message: 'سبب الرفض لا يزيد عن 300 حرف' }),
})
export type RejectPaymentInput = z.infer<typeof rejectPaymentInputSchema>

export const orderStatusChangeSchema = z
  .object({
    to: orderStatusSchema,
    reason: z
      .string()
      .trim()
      .max(300, { message: 'السبب لا يزيد عن 300 حرف' })
      .optional()
      .refine((val) => val === undefined || val === '' || val.length >= 3, {
        message: 'سبب الإلغاء يجب أن يكون 3 أحرف على الأقل',
      }),
  })
  .refine(
    (data: { to: OrderStatus; reason?: string }) => {
      if (data.to === 'cancelled') {
        return Boolean(data.reason && data.reason.trim().length >= 3)
      }
      return true
    },
    {
      message: 'سبب الإلغاء مطلوب (3 أحرف على الأقل)',
      path: ['reason'],
    },
  )
export type OrderStatusChangeInput = z.infer<typeof orderStatusChangeSchema>
