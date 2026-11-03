import { describe, expect, it, vi } from 'vitest'
import { runWithLocale } from '../common/content-locale.middleware.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { FaqService } from './faq.service.js'

describe('FaqService', () => {
  const mockFaqEntries = [
    {
      id: 'faq-1',
      topic: 'warranty',
      question: 'كيف أفعل الضمان؟',
      answer: '<p>اتصل بالخط الساخن للوكيل المعتمد.</p>',
      sort: 2,
      visible: true,
      translations: {
        en: {
          question: 'How do I activate the warranty?',
          answer: '<p>Call the authorized agent hotline.</p>',
        },
      },
    },
    {
      id: 'faq-2',
      topic: 'delivery-payment',
      question: 'ما هي طرق الدفع؟',
      answer: '<p>كاش عند الاستلام وإنستا باي.</p>',
      sort: 0,
      visible: true,
      translations: {
        en: {
          question: 'What payment methods do you accept?',
          answer: '<p>Cash on delivery and InstaPay.</p>',
        },
      },
    },
    {
      id: 'faq-3',
      topic: 'delivery-payment',
      question: 'هل يوجد شحن للمحافظات؟',
      answer: '<p>نعم نشحن لجميع المحافظات.</p>',
      sort: 1,
      visible: true,
      translations: null,
    },
  ]

  it('lists published entries ordered by topic rank then sort', async () => {
    const prisma = {
      faqEntry: {
        findMany: vi.fn().mockResolvedValue(mockFaqEntries),
      },
    } as unknown as PrismaService

    const service = new FaqService(prisma)
    const result = await service.listPublished()

    expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
      where: { visible: true },
      select: expect.any(Object),
    })

    // Topic 'delivery-payment' ranks before 'warranty', and within 'delivery-payment' sort 0 < 1
    expect(result.items.map((i) => i.id)).toEqual(['faq-2', 'faq-3', 'faq-1'])
    expect(result.items[0]?.question).toBe('ما هي طرق الدفع؟')
  })

  it('filters by topic when requested', async () => {
    const prisma = {
      faqEntry: {
        findMany: vi.fn().mockResolvedValue([mockFaqEntries[0]]),
      },
    } as unknown as PrismaService

    const service = new FaqService(prisma)
    await service.listPublished('warranty')

    expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
      where: { visible: true, topic: 'warranty' },
      select: expect.any(Object),
    })
  })

  it('localizes entries when the request locale is English, falling back to Arabic when absent', async () => {
    const prisma = {
      faqEntry: {
        findMany: vi.fn().mockResolvedValue(mockFaqEntries),
      },
    } as unknown as PrismaService

    const service = new FaqService(prisma)

    const result = runWithLocale('en', async () => service.listPublished())
    const awaited = await result

    // faq-2 has English translations
    expect(awaited.items[0]?.question).toBe('What payment methods do you accept?')
    expect(awaited.items[0]?.answer).toBe('<p>Cash on delivery and InstaPay.</p>')

    // faq-3 has null translations -> falls back to Arabic
    expect(awaited.items[1]?.question).toBe('هل يوجد شحن للمحافظات؟')
    expect(awaited.items[1]?.answer).toBe('<p>نعم نشحن لجميع المحافظات.</p>')
  })
})
