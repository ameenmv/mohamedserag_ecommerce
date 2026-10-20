import { Controller, Get } from '@nestjs/common'
import type { PublicHome } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ContentService } from './content.service.js'

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * GET /api/content/home
   * Public published home content (or built-in defaults).
   */
  @Get('home')
  @Public()
  async getHome(): Promise<PublicHome> {
    return this.contentService.getHome()
  }
}
