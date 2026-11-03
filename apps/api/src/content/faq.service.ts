import { Injectable } from '@nestjs/common'
import {
  compareFaqOrder,
  localizedText,
  type FaqTopic,
  type PublicFaqEntry,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { currentLocale } from '../common/content-locale.middleware.js'

const faqSelect = {
  id: true,
  topic: true,
  question: true,
  answer: true,
  sort: true,
  translations: true,
}

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(topic?: string): Promise<{ items: PublicFaqEntry[] }> {
    const rows = await this.prisma.faqEntry.findMany({
      where: {
        visible: true,
        ...(topic ? { topic } : {}),
      },
      select: faqSelect,
    })

    const locale = currentLocale()
    const items = [...rows]
      .sort(compareFaqOrder)
      .map((row) => ({
        id: row.id,
        topic: row.topic as FaqTopic,
        question: localizedText(row.question, row.translations, 'question', locale),
        answer: localizedText(row.answer, row.translations, 'answer', locale),
        sort: row.sort,
      }))

    return { items }
  }
}
