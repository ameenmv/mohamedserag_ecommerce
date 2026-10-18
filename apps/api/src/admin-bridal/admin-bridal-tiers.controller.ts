import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common'
import {
  bridalSettingsSchema,
  bridalTierUpdateSchema,
  PERMISSIONS,
  type AdminBridalTier,
  type BridalSettings,
  type BridalTierUpdateInput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminBridalTiersService } from './admin-bridal-tiers.service.js'

@Controller('admin/bridal')
@RequirePermission(PERMISSIONS.bridal.manage)
export class AdminBridalTiersController {
  constructor(private readonly tiersService: AdminBridalTiersService) {}

  @Get('tiers')
  async listTiers(): Promise<{ tiers: AdminBridalTier[] }> {
    return this.tiersService.listTiers()
  }

  @Put('tiers/:id')
  @Audit('bridal')
  async updateTier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bridalTierUpdateSchema)) body: BridalTierUpdateInput,
  ): Promise<AdminBridalTier> {
    return this.tiersService.updateTier(id, body)
  }

  @Get('settings')
  async getSettings(): Promise<BridalSettings> {
    return this.tiersService.getSettings()
  }

  @Put('settings')
  @Audit('bridal')
  async updateSettings(
    @Body(new ZodValidationPipe(bridalSettingsSchema)) body: BridalSettings,
  ): Promise<BridalSettings> {
    return this.tiersService.updateSettings(body)
  }
}
