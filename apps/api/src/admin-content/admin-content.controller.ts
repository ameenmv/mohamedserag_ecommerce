import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  homeDraftInputSchema,
  homePublishInputSchema,
  PERMISSIONS,
  type AdminHomeState,
  type HomeDraftOutput,
  type HomePublishOutput,
  type HomeVersionRow,
} from '@serag/shared'
import { Audit, CurrentAdmin, RequirePermission, type AdminContext } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import type { UploadedFile as AppUploadedFile } from '../admin-catalog/admin-catalog.util.js'
import { AdminContentService } from './admin-content.service.js'

@Controller('admin/content')
@RequirePermission(PERMISSIONS.content.manage)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('home')
  @RequirePermission(PERMISSIONS.content.manage)
  async getHome(): Promise<AdminHomeState> {
    return this.adminContentService.getHomeState()
  }

  @Put('home/draft')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async saveDraft(
    @Body(new ZodValidationPipe(homeDraftInputSchema)) body: HomeDraftOutput,
    @CurrentAdmin() admin: AdminContext | undefined,
  ): Promise<AdminHomeState> {
    return this.adminContentService.saveDraft(body, admin?.userId ?? null)
  }

  @Post('home/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async publish(
    @Body(new ZodValidationPipe(homePublishInputSchema)) body: HomePublishOutput,
    @CurrentAdmin() admin: AdminContext | undefined,
  ): Promise<AdminHomeState> {
    return this.adminContentService.publish(body, admin?.userId ?? null)
  }

  @Post('home/discard')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async discard(): Promise<AdminHomeState> {
    return this.adminContentService.discard()
  }

  @Get('home/versions')
  @RequirePermission(PERMISSIONS.content.manage)
  async listVersions(): Promise<{ items: HomeVersionRow[] }> {
    return this.adminContentService.listVersions()
  }

  @Post('home/versions/:id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminContext | undefined,
  ): Promise<AdminHomeState> {
    return this.adminContentService.restore(id, admin?.userId ?? null)
  }

  @Post('images')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: AppUploadedFile | undefined): Promise<{ url: string }> {
    return this.adminContentService.uploadImage(file)
  }
}
