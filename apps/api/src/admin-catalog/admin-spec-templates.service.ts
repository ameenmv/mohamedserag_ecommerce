import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  AdminSpecTemplate,
  CreateSpecTemplateOutput,
  UpdateSpecTemplateOutput,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { parseTemplateFields } from './admin-catalog.util.js'

const specTemplateInclude = {
  _count: {
    select: { categories: true },
  },
} satisfies Prisma.SpecTemplateInclude

type SpecTemplateWithCount = Prisma.SpecTemplateGetPayload<{
  include: typeof specTemplateInclude
}>

@Injectable()
export class AdminSpecTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminSpecTemplate[]> {
    const templates = await this.prisma.specTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: specTemplateInclude,
    })

    return templates.map((t) => this.toAdminSpecTemplate(t))
  }

  async getById(id: string): Promise<AdminSpecTemplate> {
    const template = await this.prisma.specTemplate.findUnique({
      where: { id },
      include: specTemplateInclude,
    })

    if (!template) {
      throw new NotFoundException(`قالب المواصفات غير موجود`)
    }

    return this.toAdminSpecTemplate(template)
  }

  async create(data: CreateSpecTemplateOutput): Promise<AdminSpecTemplate> {
    const created = await this.prisma.specTemplate.create({
      data: {
        name: data.name,
        fields: data.fields as Prisma.InputJsonValue,
      },
      include: specTemplateInclude,
    })

    return this.toAdminSpecTemplate(created)
  }

  async update(id: string, data: UpdateSpecTemplateOutput): Promise<AdminSpecTemplate> {
    const existing = await this.prisma.specTemplate.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException(`قالب المواصفات غير موجود`)
    }

    const updateData: Prisma.SpecTemplateUpdateInput = {}
    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.fields !== undefined) {
      updateData.fields = data.fields as Prisma.InputJsonValue
    }

    const updated = await this.prisma.specTemplate.update({
      where: { id },
      data: updateData,
      include: specTemplateInclude,
    })

    return this.toAdminSpecTemplate(updated)
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.specTemplate.findUnique({
      where: { id },
      include: specTemplateInclude,
    })

    if (!existing) {
      throw new NotFoundException(`قالب المواصفات غير موجود`)
    }

    if (existing._count.categories > 0) {
      throw new ConflictException({
        message: 'لا يمكن حذف القالب لأنه مرتبط بأقسام',
        code: 'IN_USE',
      })
    }

    await this.prisma.specTemplate.delete({ where: { id } })
  }

  private toAdminSpecTemplate(t: SpecTemplateWithCount): AdminSpecTemplate {
    return {
      id: t.id,
      name: t.name,
      fields: parseTemplateFields(t.fields),
      categoryCount: t._count.categories,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }
  }
}
