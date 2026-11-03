import { describe, expect, it } from 'vitest'
import { filterFaqEntries } from '../app/utils/faq-filter'
import type { PublicFaqEntry } from '@serag/shared'

const mockEntries: PublicFaqEntry[] = [
  {
    id: 'faq-1',
    topic: 'delivery-payment',
    question: 'ما هي مواعيد التوصيل لمحافظة الدقهلية؟',
    answer: '<p>التوصيل داخل المنصورة يتم خلال 24 ساعة، وباقي مدن الدقهلية خلال 48 ساعة.</p>',
    sort: 0,
  },
  {
    id: 'faq-2',
    topic: 'delivery-payment',
    question: 'هل متاح الدفع عند الاستلام؟',
    answer: '<p>نعم، متاح الدفع عند الاستلام نقداً أو عبر إنستا باي في جميع المحافظات.</p>',
    sort: 1,
  },
  {
    id: 'faq-3',
    topic: 'warranty',
    question: 'كيف أفعّل ضمان الأجهزة الكهربائية؟',
    answer: '<p>جميع الأجهزة مشمولة بضمان الوكيل الرسمي المعتمد، ومرفق معها شهادة الضمان والفاتورة الضريبية.</p>',
    sort: 0,
  },
  {
    id: 'faq-4',
    topic: 'returns',
    question: 'ما هي سياسة الاستبدال والاسترجاع؟',
    answer: '<p>يمكن استبدال أو استرجاع المنتجات غير المستخدمة خلال 14 يوماً من تاريخ الاستلام.</p>',
    sort: 0,
  },
  {
    id: 'faq-5',
    topic: 'wholesale',
    question: 'Do you offer wholesale pricing for retailers?',
    answer: '<p>Yes, we offer special wholesale rates for appliance showrooms across Egypt.</p>',
    sort: 0,
  },
]

describe('filterFaqEntries', () => {
  it('returns all entries when no filter options are given', () => {
    const result = filterFaqEntries(mockEntries)
    expect(result).toHaveLength(5)
  })

  it('filters entries strictly by topic', () => {
    const delivery = filterFaqEntries(mockEntries, { topic: 'delivery-payment' })
    expect(delivery).toHaveLength(2)
    expect(delivery.every((e) => e.topic === 'delivery-payment')).toBe(true)

    const warranty = filterFaqEntries(mockEntries, { topic: 'warranty' })
    expect(warranty).toHaveLength(1)
    expect(warranty[0]?.id).toBe('faq-3')
  })

  it('returns all entries when topic is "all"', () => {
    const result = filterFaqEntries(mockEntries, { topic: 'all' })
    expect(result).toHaveLength(5)
  })

  it('normalizes Arabic search query with hamzas and folds', () => {
    // "اجهزة" without hamza should match "الأجهزة" with hamza
    const result = filterFaqEntries(mockEntries, { query: 'اجهزة' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-3')

    // "أجهزة" with hamza
    const result2 = filterFaqEntries(mockEntries, { query: 'أجهزة' })
    expect(result2).toHaveLength(1)
    expect(result2[0]?.id).toBe('faq-3')
  })

  it('normalizes taa marbuta and haa', () => {
    // "الدقهليه" with haa should match "الدقهلية" with taa marbuta
    const result = filterFaqEntries(mockEntries, { query: 'الدقهليه' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-1')
  })

  it('searches inside answer text stripping HTML tags', () => {
    // "إنستا باي" is inside the answer of faq-2
    const result = filterFaqEntries(mockEntries, { query: 'انستا باي' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-2')
  })

  it('handles multi-token queries requiring all words to match', () => {
    const result = filterFaqEntries(mockEntries, { query: 'مواعيد الدقهلية' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-1')

    // One match word, one non-existent word -> empty
    const noMatch = filterFaqEntries(mockEntries, { query: 'مواعيد سيارة' })
    expect(noMatch).toHaveLength(0)
  })

  it('handles case-insensitive English search', () => {
    const result = filterFaqEntries(mockEntries, { query: 'WHOLESALE' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-5')
  })

  it('combines topic filter and search query correctly', () => {
    // Both faq-1 and faq-2 are delivery-payment, but only faq-2 has "دفع"
    const result = filterFaqEntries(mockEntries, {
      topic: 'delivery-payment',
      query: 'دفع',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('faq-2')

    // Searching "دفع" under warranty topic yields 0
    const emptyResult = filterFaqEntries(mockEntries, {
      topic: 'warranty',
      query: 'دفع',
    })
    expect(emptyResult).toHaveLength(0)
  })
})
