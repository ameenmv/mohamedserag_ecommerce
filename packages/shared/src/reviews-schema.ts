import { z } from 'zod'
import { REVIEW_STATUSES } from './enums.js'
import { phoneSchema } from './phone-schema.js'
import {
  cleanMultilineText,
  cleanSingleLineText,
  REVIEW_NAME_MAX,
  REVIEW_NAME_MIN,
  REVIEW_REPLY_MAX,
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
} from './reviews.js'

export const reviewInputSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب').max(64, 'معرف المنتج غير صالح'),
  stars: z
    .number({ message: 'اختار عدد النجوم' })
    .int('اختار عدد النجوم')
    .min(1, 'اختار عدد النجوم')
    .max(5, 'اختار عدد النجوم'),
  text: z
    .string({ message: 'التقييم لازم يكون 20 حرف على الأقل' })
    .transform(cleanMultilineText)
    .pipe(
      z
        .string()
        .min(REVIEW_TEXT_MIN, 'التقييم لازم يكون 20 حرف على الأقل')
        .max(REVIEW_TEXT_MAX, 'التقييم لا يزيد عن 1000 حرف'),
    ),
  name: z
    .string({ message: 'الاسم يجب أن يتكون من حرفين على الأقل' })
    .transform(cleanSingleLineText)
    .pipe(
      z
        .string()
        .min(REVIEW_NAME_MIN, 'الاسم يجب أن يتكون من حرفين على الأقل')
        .max(REVIEW_NAME_MAX, 'الاسم لا يتجاوز 60 حرف'),
    ),
  phone: phoneSchema,
  website: z.string().optional(),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>
export type ReviewInputInput = z.input<typeof reviewInputSchema>
export type ReviewInputOutput = z.output<typeof reviewInputSchema>

export const adminReviewListQuerySchema = z.object({
  status: z.enum(REVIEW_STATUSES).default('pending'),
  q: z.string().trim().max(80, 'نص البحث لا يتجاوز 80 حرف').optional(),
  stars: z.coerce
    .number()
    .int('عدد النجوم من 1 إلى 5')
    .min(1, 'عدد النجوم من 1 إلى 5')
    .max(5, 'عدد النجوم من 1 إلى 5')
    .optional(),
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى لحجم الصفحة 1')
    .max(100, 'الحد الأقصى لحجم الصفحة 100')
    .default(20),
})

export type AdminReviewListQueryInput = z.input<typeof adminReviewListQuerySchema>
export type AdminReviewListQueryOutput = z.output<typeof adminReviewListQuerySchema>

export const reviewReplySchema = z.object({
  reply: z
    .string({ message: 'نص الرد غير صالح' })
    .nullable()
    .transform((val) => {
      if (val === null) return null
      const cleaned = cleanMultilineText(val)
      return cleaned.length === 0 ? null : cleaned
    })
    .pipe(
      z
        .string()
        .max(REVIEW_REPLY_MAX, `الرد لا يتجاوز ${REVIEW_REPLY_MAX} حرف`)
        .nullable(),
    ),
})

export type ReviewReplyInput = z.input<typeof reviewReplySchema>
export type ReviewReplyOutput = z.output<typeof reviewReplySchema>
