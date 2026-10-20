import { Controller, Get, Header } from '@nestjs/common'
import { Public } from '../auth/decorators.js'
import { FeedService } from './feed.service.js'

@Controller('feeds')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /** GET /api/feeds/google.xml — Google Merchant Center RSS 2.0 feed. */
  @Get('google.xml')
  @Public()
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async googleFeed(): Promise<string> {
    return this.feedService.buildGoogleXml()
  }
}
