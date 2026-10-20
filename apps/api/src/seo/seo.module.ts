import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { FeedController } from './feed.controller.js'
import { FeedService } from './feed.service.js'
import { SeoController } from './seo.controller.js'
import { SeoService } from './seo.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [SeoController, FeedController],
  providers: [SeoService, FeedService],
})
export class SeoModule {}
