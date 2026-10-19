import { Injectable } from '@nestjs/common'
import type { PublicHome } from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { parseStoredHome } from './home-content.js'

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the current published home layout and sections, or the built-in defaults
   * when no published version exists. Never exposes draft/author/label data.
   */
  async getHome(): Promise<PublicHome> {
    const version = await this.prisma.contentVersion.findFirst({
      where: { page: 'home', status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        data: true,
        layout: true,
        publishedAt: true,
      },
    })

    if (!version) {
      const defaults = parseStoredHome(undefined, undefined)
      return {
        sections: defaults.sections,
        layout: defaults.layout,
        publishedAt: null,
      }
    }

    const parsed = parseStoredHome(version.data, version.layout)
    return {
      sections: parsed.sections,
      layout: parsed.layout,
      publishedAt: version.publishedAt?.toISOString() ?? null,
    }
  }
}
