import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  specTemplateFieldSchema,
  type AdminQuizRow,
  type AdminQuizSpecField,
  type AdminQuizState,
  type QuizDefinitionOutput,
} from '@serag/shared'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  parseStoredQuiz,
  quizWarnings,
  validateAgainstTemplate,
} from './quiz-definition.js'

const MISSING_CATEGORY_MESSAGE = 'القسم ده مش موجود'
const NO_QUIZ_MESSAGE = 'مفيش اختبار للقسم ده'
const INVALID_RULES_MESSAGE = 'في قواعد مش مظبوطة'

/** JSON columns only accept Prisma's JSON value types; the parsed Zod output is plain JSON. */
function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Validates and maps the category's spec-template JSON into the quiz editor field list. */
function readSpecFields(fields: Prisma.JsonValue | null | undefined): AdminQuizSpecField[] {
  if (!fields || !Array.isArray(fields)) {
    return []
  }
  const parsed = z.array(specTemplateFieldSchema).catch([]).parse(fields)
  return parsed.map((field) => ({ key: field.key, label: field.label, type: field.type }))
}

@Injectable()
export class AdminQuizService {
  constructor(private readonly prisma: PrismaService) {}

  async listRows(): Promise<{ items: AdminQuizRow[] }> {
    const categories = await this.prisma.category.findMany({
      where: { visible: true, specTemplateId: { not: null } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        quizRule: { select: { questions: true, rules: true } },
      },
    })

    return {
      items: categories.map((category) => {
        const definition = parseStoredQuiz(
          category.quizRule?.questions,
          category.quizRule?.rules,
        )
        return {
          categoryId: category.id,
          categorySlug: category.slug,
          categoryName: category.name,
          hasQuiz: definition !== null,
          questionCount: definition?.questions.length ?? 0,
        }
      }),
    }
  }

  async getState(categoryId: string): Promise<AdminQuizState> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId },
      select: {
        id: true,
        slug: true,
        name: true,
        specTemplate: { select: { fields: true } },
        quizRule: { select: { questions: true, rules: true } },
      },
    })

    if (!category) {
      throw new NotFoundException(MISSING_CATEGORY_MESSAGE)
    }

    const specFields = readSpecFields(category.specTemplate?.fields)
    const definition = parseStoredQuiz(category.quizRule?.questions, category.quizRule?.rules)

    return {
      category: { id: category.id, slug: category.slug, name: category.name },
      specFields,
      definition,
      warnings: definition ? quizWarnings(definition, specFields) : [],
    }
  }

  async save(categoryId: string, definition: QuizDefinitionOutput): Promise<AdminQuizState> {
    const state = await this.getState(categoryId)

    const issues = validateAgainstTemplate(definition, state.specFields)
    if (issues.length > 0) {
      const errors: Record<string, string[]> = {}
      for (const issue of issues) {
        const key = issue.path.join('.')
        ;(errors[key] ??= []).push(issue.message)
      }
      // Same `errors` shape as ZodValidationPipe so the admin form maps it per field
      throw new BadRequestException({ message: INVALID_RULES_MESSAGE, errors })
    }

    await this.prisma.quizRule.upsert({
      where: { categoryId },
      update: {
        questions: toInputJson(definition.questions),
        rules: toInputJson(definition.rules),
      },
      create: {
        categoryId,
        questions: toInputJson(definition.questions),
        rules: toInputJson(definition.rules),
      },
    })

    return this.getState(categoryId)
  }

  async remove(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId },
      select: { id: true },
    })

    if (!category) {
      throw new NotFoundException(MISSING_CATEGORY_MESSAGE)
    }

    const quiz = await this.prisma.quizRule.findUnique({
      where: { categoryId },
      select: { id: true },
    })

    if (!quiz) {
      throw new NotFoundException(NO_QUIZ_MESSAGE)
    }

    await this.prisma.quizRule.delete({ where: { categoryId } })
  }
}
