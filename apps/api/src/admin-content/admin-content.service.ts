import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  countHomeChanges,
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_LAYOUT,
  HOME_VERSION_KEEP,
  type AdminHomeState,
  type HomeContent,
  type HomeDraftOutput,
  type HomeLayout,
  type HomePublishOutput,
  type HomeVersionRow,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  detectImageMime,
  MAX_IMAGE_SIZE_BYTES,
  resolveUploadsDir,
  type UploadedFile,
} from '../admin-catalog/admin-catalog.util.js'
import { parseStoredHome } from '../content/home-content.js'

const stateSelect = {
  id: true,
  data: true,
  layout: true,
  label: true,
  publishedAt: true,
  updatedAt: true,
  userId: true,
} satisfies Prisma.ContentVersionSelect

interface HomeVersionRecord {
  id: string
  data: Prisma.JsonValue
  layout: Prisma.JsonValue
  label: string | null
  publishedAt: Date | null
  updatedAt: Date
  userId: string | null
}

interface VersionListRecord {
  id: string
  label: string | null
  publishedAt: Date | null
  createdAt: Date
  user: { name: string } | null
}

/**
 * JSON columns only accept Prisma's JSON value types; the parsed Zod output is plain
 * JSON, so this normalizes it into a value Prisma can persist.
 */
function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function encodeStoredData(sections: HomeContent, english: HomeContent | null): Prisma.InputJsonValue {
  const payload: Record<string, unknown> = { ...sections }
  if (english) {
    payload.en = english
  }
  return toInputJson(payload)
}

@Injectable()
export class AdminContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeState(): Promise<AdminHomeState> {
    const [published, draft] = await Promise.all([this.findPublished(), this.findDraft()])
    return this.buildState(published, draft)
  }

  async saveDraft(input: HomeDraftOutput, userId: string | null): Promise<AdminHomeState> {
    await this.upsertDraft(input.sections, input.layout, userId, input.english)
    return this.getHomeState()
  }

  async publish(input: HomePublishOutput, userId: string | null): Promise<AdminHomeState> {
    await this.prisma.$transaction(async (tx) => {
      const draft = await tx.contentVersion.findFirst({
        where: { page: 'home', status: 'draft' },
        orderBy: { updatedAt: 'desc' },
        select: stateSelect,
      })

      if (!draft) {
        throw new ConflictException('مفيش تعديلات للنشر')
      }

      const currentPublished = await tx.contentVersion.findFirst({
        where: { page: 'home', status: 'published' },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: stateSelect,
      })

      const draftState = parseStoredHome(draft.data, draft.layout)
      const publishedState = currentPublished
        ? parseStoredHome(currentPublished.data, currentPublished.layout)
        : { sections: DEFAULT_HOME_CONTENT, layout: DEFAULT_HOME_LAYOUT, english: null }

      const changes = countHomeChanges(draftState, publishedState)
      if (changes === 0) {
        throw new ConflictException('مفيش تعديلات للنشر')
      }

      await tx.contentVersion.create({
        data: {
          page: 'home',
          status: 'published',
          data: encodeStoredData(draftState.sections, draftState.english),
          layout: toInputJson(draftState.layout),
          label: input.label && input.label.length > 0 ? input.label : `${changes} تعديل منشور`,
          publishedAt: new Date(),
          userId,
        },
      })

      await tx.contentVersion.delete({ where: { id: draft.id } })
      await this.pruneHistory(tx)
    })

    return this.getHomeState()
  }

  async discard(): Promise<AdminHomeState> {
    const draft = await this.findDraft()
    if (draft) {
      await this.prisma.contentVersion.delete({ where: { id: draft.id } })
    }
    return this.getHomeState()
  }

  async listVersions(): Promise<{ items: HomeVersionRow[] }> {
    const rows: VersionListRecord[] = await this.prisma.contentVersion.findMany({
      where: { page: 'home', status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: HOME_VERSION_KEEP,
      select: {
        id: true,
        label: true,
        publishedAt: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    })

    return {
      items: rows.map((row, index) => ({
        id: row.id,
        label: row.label,
        publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
        author: row.user ? { name: row.user.name } : null,
        current: index === 0,
      })),
    }
  }

  async restore(id: string, userId: string | null): Promise<AdminHomeState> {
    const version = await this.prisma.contentVersion.findFirst({
      where: { id, page: 'home', status: 'published' },
      select: stateSelect,
    })

    if (!version) {
      throw new NotFoundException('النسخة دي مش موجودة')
    }

    const parsed = parseStoredHome(version.data, version.layout)
    await this.upsertDraft(parsed.sections, parsed.layout, userId, parsed.english)
    return this.getHomeState()
  }

  async uploadImage(file: UploadedFile | undefined): Promise<{ url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('ملف الصورة مطلوب')
    }

    if (file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('حجم الصورة يجب ألا يتجاوز 5 ميجابايت')
    }

    const detected = detectImageMime(file.buffer)
    if (!detected) {
      throw new BadRequestException(
        'نوع الملف غير مدعوم، يرجى رفع صورة بصيغة JPEG أو PNG أو WebP أو AVIF',
      )
    }

    const now = new Date()
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const contentDir = path.join(resolveUploadsDir(), 'content', month)
    await fs.promises.mkdir(contentDir, { recursive: true })

    const fileName = `${nanoid()}.${detected.ext}`
    await fs.promises.writeFile(path.join(contentDir, fileName), file.buffer)

    return { url: `/uploads/content/${month}/${fileName}` }
  }

  private findPublished(): Promise<HomeVersionRecord | null> {
    return this.prisma.contentVersion.findFirst({
      where: { page: 'home', status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: stateSelect,
    })
  }

  private findDraft(): Promise<HomeVersionRecord | null> {
    return this.prisma.contentVersion.findFirst({
      where: { page: 'home', status: 'draft' },
      orderBy: { updatedAt: 'desc' },
      select: stateSelect,
    })
  }

  private buildState(
    publishedRow: HomeVersionRecord | null,
    draftRow: HomeVersionRecord | null,
  ): AdminHomeState {
    const publishedState = publishedRow
      ? parseStoredHome(publishedRow.data, publishedRow.layout)
      : { sections: DEFAULT_HOME_CONTENT, layout: DEFAULT_HOME_LAYOUT, english: null }

    const published: AdminHomeState['published'] = {
      sections: publishedState.sections,
      layout: publishedState.layout,
      publishedAt: publishedRow?.publishedAt?.toISOString() ?? null,
      label: publishedRow?.label ?? null,
      english: publishedState.english,
    }

    const draftSource = draftRow ? parseStoredHome(draftRow.data, draftRow.layout) : publishedState
    const draft: AdminHomeState['draft'] = {
      sections: draftSource.sections,
      layout: draftSource.layout,
      updatedAt: draftRow?.updatedAt.toISOString() ?? null,
      english: draftSource.english,
    }

    return { draft, published, changes: countHomeChanges(draft, published) }
  }

  private async upsertDraft(
    sections: HomeContent,
    layout: HomeLayout,
    userId: string | null,
    english?: HomeContent | null,
  ): Promise<void> {
    const draft = await this.findDraft()
    let targetEnglish: HomeContent | null
    if (english !== undefined) {
      targetEnglish = english
    } else {
      const existingDraft = draft ? parseStoredHome(draft.data, draft.layout) : null
      const existingPublished = existingDraft ? null : await this.findPublished()
      const fallbackTarget =
        existingDraft ??
        (existingPublished ? parseStoredHome(existingPublished.data, existingPublished.layout) : null)
      targetEnglish = fallbackTarget?.english ?? null
    }

    if (draft) {
      await this.prisma.contentVersion.update({
        where: { id: draft.id },
        data: {
          data: encodeStoredData(sections, targetEnglish),
          layout: toInputJson(layout),
        },
      })
      return
    }

    await this.prisma.contentVersion.create({
      data: {
        page: 'home',
        status: 'draft',
        data: encodeStoredData(sections, targetEnglish),
        layout: toInputJson(layout),
        userId,
      },
    })
  }

  private async pruneHistory(tx: Prisma.TransactionClient): Promise<void> {
    const stale = await tx.contentVersion.findMany({
      where: { page: 'home', status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: HOME_VERSION_KEEP,
      select: { id: true },
    })

    if (stale.length > 0) {
      await tx.contentVersion.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } },
      })
    }
  }
}
