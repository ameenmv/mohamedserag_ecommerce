import { Controller, Get } from '@nestjs/common'
import type { SitemapEntry } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { SeoService } from './seo.service.js'

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /** GET /api/seo/sitemap-entries — public, visible, non-archived URLs for the Nuxt sitemap route. */
  @Get('sitemap-entries')
  @Public()
  async sitemapEntries(): Promise<{ entries: SitemapEntry[] }> {
    return { entries: await this.seoService.sitemapEntries() }
  }
}
