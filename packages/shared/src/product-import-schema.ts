import { z } from 'zod'

export const productImportInputSchema = z.object({
  csv: z
    .string({ error: 'نص الملف مطلوب' })
    .max(2 * 1024 * 1024, 'حجم الملف يجب ألا يتجاوز 2 ميجابايت'),
})

export type ProductImportInput = z.infer<typeof productImportInputSchema>
