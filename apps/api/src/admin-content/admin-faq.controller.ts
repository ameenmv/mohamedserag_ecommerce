import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  faqInputSchema,
  faqPatchSchema,
  reorderFaqEntriesSchema,
  PERMISSIONS,
  type AdminFaqEntry,
  type FaqInputOutput,
  type FaqPatchOutput,
  type ReorderFaqEntriesOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminFaqService } from './admin-faq.service.js'

@Controller('admin/faq')
@RequirePermission(PERMISSIONS.content.manage)
export class AdminFaqController {
  constructor(private readonly adminFaqService: AdminFaqService) {}

  @Get()
  @RequirePermission(PERMISSIONS.content.manage)
  async list(@Query('topic') topic?: string): Promise<{ items: AdminFaqEntry[] }> {
    return this.adminFaqService.list(topic)
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async reorderPost(
    @Body(new ZodValidationPipe(reorderFaqEntriesSchema)) body: ReorderFaqEntriesOutput,
  ): Promise<{ success: boolean }> {
    await this.adminFaqService.reorder(body.ids)
    return { success: true }
  }

  @Put('reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async reorderPut(
    @Body(new ZodValidationPipe(reorderFaqEntriesSchema)) body: ReorderFaqEntriesOutput,
  ): Promise<{ success: boolean }> {
    await this.adminFaqService.reorder(body.ids)
    return { success: true }
  }

  @Post()
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async create(
    @Body(new ZodValidationPipe(faqInputSchema)) body: FaqInputOutput,
  ): Promise<AdminFaqEntry> {
    return this.adminFaqService.create(body)
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  async getOne(@Param('id') id: string): Promise<AdminFaqEntry> {
    return this.adminFaqService.getById(id)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(faqPatchSchema)) body: FaqPatchOutput,
  ): Promise<AdminFaqEntry> {
    return this.adminFaqService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async remove(@Param('id') id: string): Promise<void> {
    return this.adminFaqService.remove(id)
  }
}
