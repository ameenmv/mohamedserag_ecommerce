import { z } from 'zod'
import { REPORT_GROUPINGS, REPORT_PRESETS, MAX_REPORT_DAYS } from './reports.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [year, month, day] = value.split('-').map((part) => Number(part))
  if (month === undefined || day === undefined || year === undefined) return false
  if (month < 1 || month > 12) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function toUtcMillis(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part))
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const dateKeySchema = z
  .string({ message: 'التاريخ مطلوب بصيغة YYYY-MM-DD' })
  .refine(isValidDateKey, { message: 'التاريخ مش صحيح (YYYY-MM-DD)' })

export const reportQuerySchema = z
  .object({
    preset: z.enum(REPORT_PRESETS, { message: 'الفترة المختارة مش صحيحة' }).optional(),
    from: dateKeySchema.optional(),
    to: dateKeySchema.optional(),
    groupBy: z.enum(REPORT_GROUPINGS, { message: 'التجميع مش صحيح' }).default('day'),
  })
  .refine((data) => data.preset !== undefined || (data.from !== undefined && data.to !== undefined), {
    message: 'اختار فترة جاهزة أو حدد من/إلى',
    path: ['preset'],
  })
  .refine((data) => data.from === undefined || data.to === undefined || data.from <= data.to, {
    message: 'تاريخ البداية لازم يكون قبل تاريخ النهاية',
    path: ['from'],
  })
  .refine(
    (data) =>
      data.from === undefined ||
      data.to === undefined ||
      toUtcMillis(data.to) - toUtcMillis(data.from) <= (MAX_REPORT_DAYS - 1) * 86_400_000,
    {
      message: `المدة القصوى للتقرير ${MAX_REPORT_DAYS} يوم`,
      path: ['to'],
    },
  )

export type ReportQueryInput = z.input<typeof reportQuerySchema>
export type ReportQueryOutput = z.output<typeof reportQuerySchema>
