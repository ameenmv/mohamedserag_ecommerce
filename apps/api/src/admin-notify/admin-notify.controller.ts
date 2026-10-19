import {
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common'
import {
  type AdminNotifyMarkSentResponse,
  type AdminNotifyProductDetail,
  type AdminNotifyProductRow,
  PERMISSIONS,
} from '@serag/shared'
import { Audit, CurrentAdmin, RequirePermission, type AdminContext } from '../auth/decorators.js'
import { AdminNotifyService } from './admin-notify.service.js'

@Controller('admin/notify-me')
@RequirePermission(PERMISSIONS.notify.manage)
export class AdminNotifyController {
  constructor(private readonly adminNotifyService: AdminNotifyService) {}

  @Get()
  @RequirePermission(PERMISSIONS.notify.manage)
  async list(): Promise<AdminNotifyProductRow[]> {
    return this.adminNotifyService.list()
  }

  @Get(':productId')
  @RequirePermission(PERMISSIONS.notify.manage)
  async getDetail(@Param('productId') productId: string): Promise<AdminNotifyProductDetail> {
    return this.adminNotifyService.getDetail(productId)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.notify.manage)
  @Audit('notify_request')
  async markSent(
    @Param('id') id: string,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminNotifyMarkSentResponse> {
    return this.adminNotifyService.markSent(id, admin?.userId)
  }
}
