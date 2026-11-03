import { Controller, Get, Query } from '@nestjs/common'
import type { PublicFaqEntry } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { FaqService } from './faq.service.js'

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /** GET /api/faq — published FAQ entries, ordered by topic rank then sort. */
  @Get()
  @Public()
  async list(@Query('topic') topic?: string): Promise<{ items: PublicFaqEntry[] }> {
    return this.faqService.listPublished(topic)
  }
}
