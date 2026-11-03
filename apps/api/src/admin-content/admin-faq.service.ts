import { Injectable, NotFoundException } from '@nestjs/common'
import {
  compareFaqOrder,
  type AdminFaqEntry,
  type FaqInputOutput,
  type FaqPatchOutput,
  type FaqTopic,
} from '@serag/shared'
import { sanitizeRichText } from '../common/rich-text.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const adminFaqSelect = {
  id: true,
  topic: true,
  question: true,
  answer: true,
  sort: true,
  visible: true,
  translations: true,
  createdAt: true,
  updatedAt: true,
}

interface StoredFaqRow {
  id: string
  topic: string
  question: string
  answer: string
  sort: number
  visible: boolean
  translations: unknown
  createdAt: Date
  updatedAt: Date
}

function cleanFaqTranslations(
  translations: FaqInputOutput['translations'],
): Prisma.InputJsonValue | undefined {
  if (translations === undefined) return undefined
  if (!translations || !translations.en) return {}
  const en: Record<string, string> = {}
  if (translations.en.question && translations.en.question.trim().length > 0) {
    en.question = translations.en.question.trim()
  }
  if (translations.en.answer) {
    const cleanAnswer = sanitizeRichText(translations.en.answer, 'page')
    if (cleanAnswer && cleanAnswer.trim().length > 0) {
      en.answer = cleanAnswer
    }
  }
  return Object.keys(en).length > 0 ? { en } : {}
}

function toAdminFaqEntry(row: StoredFaqRow): AdminFaqEntry {
  return {
    id: row.id,
    topic: row.topic as FaqTopic,
    question: row.question,
    answer: row.answer,
    sort: row.sort,
    visible: row.visible,
    translations: (row.translations as AdminFaqEntry['translations']) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class AdminFaqService {
  constructor(private readonly prisma: PrismaService) {}

  async list(topic?: string): Promise<{ items: AdminFaqEntry[] }> {
    const rows = await this.prisma.faqEntry.findMany({
      where: topic ? { topic } : {},
      select: adminFaqSelect,
    })

    const items = [...rows]
      .sort(compareFaqOrder)
      .map((row) => toAdminFaqEntry(row as StoredFaqRow))

    return { items }
  }

  async getById(id: string): Promise<AdminFaqEntry> {
    const row = await this.prisma.faqEntry.findUnique({
      where: { id },
      select: adminFaqSelect,
    })

    if (!row) {
      throw new NotFoundException('السؤال ده مش موجود')
    }

    return toAdminFaqEntry(row as StoredFaqRow)
  }

  async create(input: FaqInputOutput): Promise<AdminFaqEntry> {
    const translationsUpdate = cleanFaqTranslations(input.translations)

    const row = await this.prisma.faqEntry.create({
      data: {
        topic: input.topic,
        question: input.question,
        answer: sanitizeRichText(input.answer, 'page'),
        sort: input.sort ?? 0,
        visible: input.visible ?? true,
        translations: (translationsUpdate ?? {}) as Prisma.InputJsonValue,
      },
      select: adminFaqSelect,
    })

    return toAdminFaqEntry(row as StoredFaqRow)
  }

  async update(id: string, input: FaqPatchOutput): Promise<AdminFaqEntry> {
    const existing = await this.prisma.faqEntry.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundException('السؤال ده مش موجود')
    }

    const translationsUpdate =
      input.translations !== undefined ? cleanFaqTranslations(input.translations) : undefined

    const row = await this.prisma.faqEntry.update({
      where: { id },
      data: {
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        ...(input.question !== undefined ? { question: input.question } : {}),
        ...(input.answer !== undefined ? { answer: sanitizeRichText(input.answer, 'page') } : {}),
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
        ...(input.visible !== undefined ? { visible: input.visible } : {}),
        ...(translationsUpdate !== undefined
          ? { translations: translationsUpdate as Prisma.InputJsonValue }
          : {}),
      },
      select: adminFaqSelect,
    })

    return toAdminFaqEntry(row as StoredFaqRow)
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.faqEntry.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundException('السؤال ده مش موجود')
    }

    await this.prisma.faqEntry.delete({ where: { id } })
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.faqEntry.update({
          where: { id },
          data: { sort: index },
        }),
      ),
    )
  }
}
