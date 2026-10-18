import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common'
import {
  bridalDeliveryDateSchema,
  bridalLockExtendSchema,
  PERMISSIONS,
  type BridalDeliveryDateInput,
  type BridalExpiringItem,
  type BridalLockExtendInput,
  type BridalRepriceResult,
  type OrderStockShortage,
} from '@serag/shared'
import {
  type AdminContext,
  Audit,
  CurrentAdmin,
  RequirePermission,
} from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { BridalReservationService } from './bridal-reservation.service.js'

@Controller('admin/orders')
export class AdminBridalActionsController {
  constructor(private readonly reservationService: BridalReservationService) {}

  @Post(':id/delivery-date')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async setDeliveryDate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bridalDeliveryDateSchema)) body: BridalDeliveryDateInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<{ shortages: OrderStockShortage[] }> {
    return this.reservationService.agreeDeliveryDate(id, body, admin?.userId)
  }

  @Post(':id/lock-extend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async extendLock(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bridalLockExtendSchema)) body: BridalLockExtendInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<{ lockedUntil: Date }> {
    return this.reservationService.extendLock(id, body, admin?.userId)
  }

  @Post(':id/reprice')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async reprice(
    @Param('id') id: string,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<BridalRepriceResult> {
    return this.reservationService.reprice(id, admin?.userId)
  }
}

@Controller('admin/bridal')
export class AdminBridalExpiringController {
  constructor(private readonly reservationService: BridalReservationService) {}

  @Get('expiring')
  @RequirePermission(PERMISSIONS.orders.read)
  async getExpiring(): Promise<{ items: BridalExpiringItem[] }> {
    return this.reservationService.getExpiringReservations()
  }
}
