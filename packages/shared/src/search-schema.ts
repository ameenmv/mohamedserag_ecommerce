import { z } from 'zod'

/**
 * Validates search query parameters for `GET /api/search` (PRD US-2.1).
 * Used for live header search dropdown.
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'كلمة البحث مطلوبة')
    .max(100, 'كلمة البحث لا يمكن أن تتجاوز 100 حرف'),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى هو 1')
    .max(20, 'الحد الأقصى هو 20')
    .default(8),
})

export type SearchQueryInput = z.input<typeof searchQuerySchema>
export type SearchQueryOutput = z.output<typeof searchQuerySchema>
