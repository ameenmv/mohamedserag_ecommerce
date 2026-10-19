import { Controller, Get, Param } from '@nestjs/common'
import type { PublicPage, PublicPageLink } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { PagesService } from './pages.service.js'

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /** GET /api/pages — published policy pages for the footer, fixed order. */
  @Get()
  @Public()
  async list(): Promise<{ items: PublicPageLink[] }> {
    return this.pagesService.listPublished()
  }

  /** GET /api/pages/:slug — a single published page or 404. */
  @Get(':slug')
  @Public()
  async getOne(@Param('slug') slug: string): Promise<PublicPage> {
    return this.pagesService.getPublishedBySlug(slug)
  }
}
