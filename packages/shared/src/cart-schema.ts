import { z } from 'zod'
import { paymentMethodSchema } from './enums.js'

export const cartQuoteItemInputSchema = z.object({
  productId: z.string().trim().min(1, { message: 'معرف المنتج مطلوب' }),
  qty: z
    .number()
    .int({ message: 'الكمية يجب أن تكون عدداً صحيحاً' })
    .min(1, { message: 'الكمية يجب أن تكون 1 على الأقل' })
    .max(99, { message: 'الحد الأقصى للكمية هو 99' }),
  knownPrice: z
    .number()
    .int({ message: 'السعر يجب أن يكون عدداً صحيحاً' })
    .min(0, { message: 'السعر لا يمكن أن يكون سالباً' })
    .optional(),
})
export type CartQuoteItemInput = z.infer<typeof cartQuoteItemInputSchema>

export function mergeCartItems(items: readonly CartQuoteItemInput[]): CartQuoteItemInput[] {
  const merged = new Map<string, CartQuoteItemInput>()
  for (const item of items) {
    const existing = merged.get(item.productId)
    if (!existing) {
      merged.set(item.productId, {
        productId: item.productId,
        qty: Math.min(99, Math.max(1, item.qty)),
        knownPrice: item.knownPrice,
      })
    } else {
      merged.set(item.productId, {
        productId: item.productId,
        qty: Math.min(99, existing.qty + item.qty),
        knownPrice: item.knownPrice ?? existing.knownPrice,
      })
    }
  }
  return Array.from(merged.values())
}

export const cartQuoteInputSchema = z.object({
  items: z
    .array(cartQuoteItemInputSchema)
    .min(1, { message: 'سلة التسوق فارغة' })
    .max(50, { message: 'الحد الأقصى لعدد عناصر السلة هو 50' })
    .transform((items) => mergeCartItems(items)),
  governorate: z.string().trim().max(60, { message: 'اسم المحافظة لا يزيد عن 60 حرفاً' }).optional(),
  city: z.string().trim().max(60, { message: 'اسم المدينة لا يزيد عن 60 حرفاً' }).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  couponCode: z.string().trim().max(40, { message: 'كود الكوبون لا يزيد عن 40 حرفاً' }).optional(),
})

export type CartQuoteInput = z.infer<typeof cartQuoteInputSchema>
