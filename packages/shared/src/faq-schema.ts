import { z } from 'zod'
import { FAQ_TOPICS } from './faq.js'

export const faqTranslationsEnSchema = z
  .object({
    question: z.string().trim().max(300, 'السؤال بيزيد عن 300 حرف').nullable().optional(),
    answer: z.string().trim().max(10000, 'الإجابة بتزيد عن 10000 حرف').nullable().optional(),
  })
  .transform((data) => {
    const res: {
      question?: string
      answer?: string
    } = {}
    if (data.question && data.question.length > 0) res.question = data.question
    if (data.answer && data.answer.length > 0) res.answer = data.answer
    return res
  })

export const faqTranslationsSchema = z.object({
  en: faqTranslationsEnSchema.optional(),
})

export type FaqTranslationsEnInput = z.input<typeof faqTranslationsEnSchema>
export type FaqTranslationsEn = z.output<typeof faqTranslationsEnSchema>
export type FaqTranslationsInput = z.input<typeof faqTranslationsSchema>
export type FaqTranslations = z.output<typeof faqTranslationsSchema>

export const faqInputSchema = z.object({
  topic: z.enum(FAQ_TOPICS, { message: 'تصنيف السؤال غير صالح' }),
  question: z
    .string({ message: 'السؤال مطلوب' })
    .trim()
    .min(1, 'السؤال مطلوب')
    .max(300, 'السؤال بيزيد عن 300 حرف'),
  answer: z
    .string({ message: 'الإجابة مطلوبة' })
    .trim()
    .min(1, 'الإجابة مطلوبة')
    .max(10000, 'الإجابة بتزيد عن 10000 حرف'),
  sort: z.coerce.number().int().min(0, 'الترتيب لازم يكون رقم موجب').default(0),
  visible: z.boolean({ message: 'حالة الظهور غير صالحة' }).default(true),
  translations: faqTranslationsSchema.nullable().optional(),
})

export const faqPatchSchema = faqInputSchema.partial()

export const reorderFaqEntriesSchema = z.object({
  ids: z.array(z.string().trim().min(1, 'معرف غير صالح')).min(1, 'قائمة المعرفات مطلوبة'),
})

export type FaqInput = z.input<typeof faqInputSchema>
export type FaqInputOutput = z.output<typeof faqInputSchema>
export type FaqPatch = z.input<typeof faqPatchSchema>
export type FaqPatchOutput = z.output<typeof faqPatchSchema>
export type ReorderFaqEntriesInput = z.input<typeof reorderFaqEntriesSchema>
export type ReorderFaqEntriesOutput = z.output<typeof reorderFaqEntriesSchema>

export const createFaqEntrySchema = faqInputSchema
export const updateFaqEntrySchema = faqPatchSchema
export type CreateFaqEntryInput = FaqInput
export type CreateFaqEntryOutput = FaqInputOutput
export type UpdateFaqEntryInput = FaqPatch
export type UpdateFaqEntryOutput = FaqPatchOutput
