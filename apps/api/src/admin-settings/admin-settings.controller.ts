import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common'
import {
  PERMISSIONS,
  type AdminSettingsResponse,
  type SettingsSectionState,
  type SettingsUpdate,
  settingsUpdateSchema,
  TEMPLATE_KEYS,
} from '@serag/shared'
import { z } from 'zod'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminSettingsService, isSettingsSection } from './admin-settings.service.js'

// Lighter than templatePreviewInputSchema: unknown variables are reported, not rejected
const previewInputSchema = z.object({
  key: z.enum(TEMPLATE_KEYS, { message: 'القالب مش صحيح' }),
  template: z
    .string({ message: 'نص القالب مطلوب' })
    .max(1000, { message: 'نص القالب بيزيد عن 1000 حرف' }),
})

type PreviewInput = z.infer<typeof previewInputSchema>

@Controller('admin/settings')
@RequirePermission(PERMISSIONS.settings.manage)
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  async getAll(): Promise<AdminSettingsResponse> {
    return this.adminSettingsService.getAll()
  }

  @Post('templates/preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Body(new ZodValidationPipe(previewInputSchema)) body: PreviewInput,
  ): { text: string; unknownVariables: string[] } {
    return this.adminSettingsService.previewTemplate(body.key, body.template)
  }

  @Put(':section')
  @Audit('settings')
  async save(
    @Param('section') section: string,
    @Body(new ZodValidationPipe(settingsUpdateSchema)) body: SettingsUpdate,
  ): Promise<SettingsSectionState<unknown>> {
    if (!isSettingsSection(section)) {
      throw new BadRequestException({
        message: 'القسم مش موجود',
        errors: { section: ['القسم مش موجود'] },
      })
    }
    return this.adminSettingsService.save(section, body.value, body.version)
  }
}
