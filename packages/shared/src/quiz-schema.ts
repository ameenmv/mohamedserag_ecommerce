import { z } from 'zod'
import { QUIZ_OPERATORS } from './quiz.js'

const quizDefinitionShape = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/, 'معرف السؤال غير صالح'),
        text: z
          .string({ message: 'نص السؤال مطلوب' })
          .trim()
          .min(1, 'نص السؤال مطلوب')
          .max(120, 'نص السؤال بيزيد عن 120 حرف'),
        answers: z
          .array(
            z.object({
              id: z.string().regex(/^[a-z0-9-]{1,40}$/, 'معرف الإجابة غير صالح'),
              text: z
                .string({ message: 'نص الإجابة مطلوب' })
                .trim()
                .min(1, 'نص الإجابة مطلوب')
                .max(60, 'نص الإجابة بيزيد عن 60 حرف'),
            }),
          )
          .min(2, 'يحتاج الاختبار لإجابتين على الأقل')
          .max(6, 'أقصى عدد إجابات 6'),
      }),
    )
    .min(3, 'الاختبار لازم يكون من 3 لـ 5 أسئلة')
    .max(5, 'الاختبار لازم يكون من 3 لـ 5 أسئلة'),
  rules: z
    .array(
      z.object({
        answerId: z.string({ message: 'معرف الإجابة غير صالح' }),
        field: z
          .string({ message: 'حقل المواصفة مطلوب' })
          .trim()
          .min(1, 'حقل المواصفة مطلوب')
          .max(60, 'حقل المواصفة بيزيد عن 60 حرف'),
        op: z.enum(QUIZ_OPERATORS),
        value: z.union([z.string().max(60), z.number(), z.boolean(), z.null()]),
        points: z.number({ message: 'نقاط القاعدة غير صالحة' }).int().min(-5).max(5),
        reason: z
          .string({ message: 'سبب القاعدة مطلوب' })
          .trim()
          .min(1, 'سبب القاعدة مطلوب')
          .max(60, 'سبب القاعدة بيزيد عن 60 حرف'),
      }),
    )
    .max(100, 'أقصى عدد قواعد 100'),
})

/** Quiz definition with cross-field checks: unique question ids, unique answer ids (never «unsure»), rules tied to real answers. */
export const quizDefinitionSchema = quizDefinitionShape.superRefine((data, ctx) => {
  const questionIds = new Set<string>()
  const answerIds = new Set<string>()
  for (const question of data.questions) {
    if (questionIds.has(question.id)) {
      ctx.addIssue({ code: 'custom', message: 'معرفات الأسئلة مكررة', path: ['questions'] })
    }
    questionIds.add(question.id)
    for (const answer of question.answers) {
      if (answerIds.has(answer.id) || answer.id === 'unsure') {
        ctx.addIssue({ code: 'custom', message: 'معرفات الإجابات مكررة أو غير صالحة', path: ['questions'] })
      }
      answerIds.add(answer.id)
    }
  }
  data.rules.forEach((rule, index) => {
    if (!answerIds.has(rule.answerId)) {
      ctx.addIssue({ code: 'custom', message: 'القاعدة مربوطة بإجابة مش موجودة', path: ['rules', index, 'answerId'] })
    }
  })
})

export const quizResultsInputSchema = z.object({
  answers: z.record(z.string().max(40), z.string().max(40)).refine((obj) => Object.keys(obj).length <= 10, {
    message: 'أقصى عدد إجابات 10',
  }),
})

export type QuizDefinitionInput = z.input<typeof quizDefinitionSchema>
export type QuizDefinitionOutput = z.output<typeof quizDefinitionSchema>
export type QuizResultsInput = z.input<typeof quizResultsInputSchema>
export type QuizResultsOutput = z.output<typeof quizResultsInputSchema>
