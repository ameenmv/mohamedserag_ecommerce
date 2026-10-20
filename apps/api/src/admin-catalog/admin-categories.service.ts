import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  AdminCategory,
  CreateCategoryOutput,
  ReorderCategoriesInput,
  UpdateCategoryOutput,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const categoryInclude = {
  specTemplate: { select: { id: true, name: true } },
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude

type CategoryWithRelations = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminCategory[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: categoryInclude,
    })

    return categories.map((c) => this.toAdminCategory(c))
  }

  async getById(id: string): Promise<AdminCategory> {
    const c = await this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    })

    if (!c) {
      throw new NotFoundException('القسم غير موجود')
    }

    return this.toAdminCategory(c)
  }

  async create(data: CreateCategoryOutput): Promise<AdminCategory> {
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    })
    if (existingSlug) {
      throw new ConflictException({
        message: 'الرابط التعريفي مستخدم بالفعل',
        field: 'slug',
      })
    }

    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      })
      if (!parent) {
        throw new BadRequestException({
          message: 'القسم الأب غير موجود',
          field: 'parentId',
        })
      }
    }

    if (data.specTemplateId) {
      const template = await this.prisma.specTemplate.findUnique({
        where: { id: data.specTemplateId },
      })
      if (!template) {
        throw new BadRequestException({
          message: 'قالب المواصفات غير موجود',
          field: 'specTemplateId',
        })
      }
    }

    const created = await this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
        specTemplateId: data.specTemplateId ?? null,
        intro: data.intro ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        sort: data.sort,
        visible: data.visible,
      },
      include: categoryInclude,
    })

    return this.toAdminCategory(created)
  }

  async update(id: string, data: UpdateCategoryOutput): Promise<AdminCategory> {
    const existing = await this.prisma.category.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('القسم غير موجود')
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      })
      if (slugConflict) {
        throw new ConflictException({
          message: 'الرابط التعريفي مستخدم بالفعل',
          field: 'slug',
        })
      }
    }

    if (data.parentId !== undefined) {
      if (data.parentId !== null) {
        await this.assertNoCycle(id, data.parentId)
      }
    }

    if (data.specTemplateId) {
      const template = await this.prisma.specTemplate.findUnique({
        where: { id: data.specTemplateId },
      })
      if (!template) {
        throw new BadRequestException({
          message: 'قالب المواصفات غير موجود',
          field: 'specTemplateId',
        })
      }
    }

    const updateData: Prisma.CategoryUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.parentId !== undefined) {
      updateData.parent = data.parentId === null ? { disconnect: true } : { connect: { id: data.parentId } }
    }
    if (data.specTemplateId !== undefined) {
      updateData.specTemplate =
        data.specTemplateId === null ? { disconnect: true } : { connect: { id: data.specTemplateId } }
    }
    if (data.intro !== undefined) updateData.intro = data.intro
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription
    if (data.sort !== undefined) updateData.sort = data.sort
    if (data.visible !== undefined) updateData.visible = data.visible

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: categoryInclude,
    })

    return this.toAdminCategory(updated)
  }

  async delete(id: string): Promise<void> {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    })

    if (!cat) {
      throw new NotFoundException('القسم غير موجود')
    }

    if (cat._count.products > 0 || cat._count.children > 0) {
      throw new ConflictException({
        message: 'لا يمكن حذف القسم لأنه يحتوي على منتجات أو أقسام فرعية',
        code: 'HAS_RELATIONS',
      })
    }

    await this.prisma.category.delete({ where: { id } })
  }

  async reorder(body: ReorderCategoriesInput): Promise<void> {
    const { ids } = body
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sort: index },
        }),
      ),
    )
  }

  private async assertNoCycle(categoryId: string, proposedParentId: string): Promise<void> {
    if (categoryId === proposedParentId) {
      throw new BadRequestException({
        message: 'لا يمكن تعيين القسم كأب لنفسه',
        field: 'parentId',
      })
    }

    let currentId: string | null = proposedParentId
    const visited = new Set<string>()

    while (currentId) {
      if (visited.has(currentId)) {
        break
      }
      visited.add(currentId)

      if (currentId === categoryId) {
        throw new BadRequestException({
          message: 'لا يمكن تعيين هذا القسم كأب لأنه ينشئ حلقة تكرارية',
          field: 'parentId',
        })
      }

      const parentRecord: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      })

      if (!parentRecord) {
        throw new BadRequestException({
          message: 'القسم الأب غير موجود',
          field: 'parentId',
        })
      }

      currentId = parentRecord.parentId
    }
  }

  private toAdminCategory(c: CategoryWithRelations): AdminCategory {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      specTemplateId: c.specTemplateId,
      intro: c.intro,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      sort: c.sort,
      visible: c.visible,
      productCount: c._count.products,
      specTemplate: c.specTemplate,
      parent: c.parent,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }
}
