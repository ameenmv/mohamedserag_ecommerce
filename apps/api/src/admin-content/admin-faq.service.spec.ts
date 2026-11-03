import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../prisma/prisma.service.js'
import { AdminFaqService } from './admin-faq.service.js'

describe('AdminFaqService', () => {
  const mockNow = new Date('2026-11-03T20:00:00.000Z')

  const sampleDbRow = {
    id: 'faq-1',
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
    createdAt: mockNow,
    updatedAt: mockNow,
  }

  it('lists entries sorted by topic order and sort', async () => {
    const rows = [
      { ...sampleDbRow, id: 'b', topic: 'warranty', sort: 1 },
      { ...sampleDbRow, id: 'a', topic: 'delivery-payment', sort: 2 },
      { ...sampleDbRow, id: 'c', topic: 'delivery-payment', sort: 0 },
    ]

    const prisma = {
      faqEntry: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    const res = await service.list()

    expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
      where: {},
      select: expect.any(Object),
    })

    expect(res.items.map((i) => i.id)).toEqual(['c', 'a', 'b'])
    expect(res.items[0]?.createdAt).toBe(mockNow.toISOString())
  })

  it('filters by topic when requested', async () => {
    const prisma = {
      faqEntry: {
        findMany: vi.fn().mockResolvedValue([sampleDbRow]),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await service.list('delivery-payment')

    expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
      where: { topic: 'delivery-payment' },
      select: expect.any(Object),
    })
  })

  it('returns entry by ID', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue(sampleDbRow),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    const res = await service.getById('faq-1')

    expect(res.id).toBe('faq-1')
    expect(res.question).toBe('ما هي طرق الدفع؟')
  })

  it('throws NotFoundException when entry is not found', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await expect(service.getById('non-existent')).rejects.toThrow(NotFoundException)
  })

  it('sanitizes answer and English translations on create', async () => {
    const createdRow = {
      ...sampleDbRow,
      id: 'faq-new',
      answer: '<p>إجابة آمنة</p>',
    }

    const prisma = {
      faqEntry: {
        create: vi.fn().mockResolvedValue(createdRow),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    const result = await service.create({
      topic: 'warranty',
      question: 'سؤال جديد',
      answer: '<p>إجابة آمنة</p><script>alert("xss")</script>',
      sort: 0,
      visible: true,
      translations: {
        en: {
          question: 'New question',
          answer: '<p>Safe answer</p><style>body { color: red; }</style>',
        },
      },
    })

    expect(prisma.faqEntry.create).toHaveBeenCalledWith({
      data: {
        topic: 'warranty',
        question: 'سؤال جديد',
        answer: '<p>إجابة آمنة</p>',
        sort: 0,
        visible: true,
        translations: {
          en: {
            question: 'New question',
            answer: '<p>Safe answer</p>',
          },
        },
      },
      select: expect.any(Object),
    })

    expect(result.id).toBe('faq-new')
  })

  it('updates entry and sanitizes updated content', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue({ id: 'faq-1' }),
        update: vi.fn().mockResolvedValue({
          ...sampleDbRow,
          answer: '<p>إجابة محدثة</p>',
        }),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    const res = await service.update('faq-1', {
      answer: '<p>إجابة محدثة</p><iframe src="https://evil.test"></iframe>',
    })

    expect(prisma.faqEntry.update).toHaveBeenCalledWith({
      where: { id: 'faq-1' },
      data: {
        answer: '<p>إجابة محدثة</p>',
      },
      select: expect.any(Object),
    })

    expect(res.answer).toBe('<p>إجابة محدثة</p>')
  })

  it('throws NotFoundException on update if ID is missing', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await expect(service.update('missing', { question: 'محدث' })).rejects.toThrow(
      NotFoundException,
    )
  })

  it('deletes entry when existing', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue({ id: 'faq-1' }),
        delete: vi.fn().mockResolvedValue({ id: 'faq-1' }),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await service.remove('faq-1')

    expect(prisma.faqEntry.delete).toHaveBeenCalledWith({ where: { id: 'faq-1' } })
  })

  it('throws NotFoundException on remove if ID is missing', async () => {
    const prisma = {
      faqEntry: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException)
  })

  it('reorders entries in a transaction', async () => {
    const prisma = {
      faqEntry: {
        update: vi.fn().mockImplementation(({ where, data }) => ({ id: where.id, sort: data.sort })),
      },
      $transaction: vi.fn().mockImplementation(async (updates) => Promise.all(updates)),
    } as unknown as PrismaService

    const service = new AdminFaqService(prisma)
    await service.reorder(['faq-3', 'faq-1', 'faq-2'])

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.faqEntry.update).toHaveBeenCalledWith({
      where: { id: 'faq-3' },
      data: { sort: 0 },
    })
    expect(prisma.faqEntry.update).toHaveBeenCalledWith({
      where: { id: 'faq-1' },
      data: { sort: 1 },
    })
    expect(prisma.faqEntry.update).toHaveBeenCalledWith({
      where: { id: 'faq-2' },
      data: { sort: 2 },
    })
  })
})
