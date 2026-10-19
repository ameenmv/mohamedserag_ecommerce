import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  adminCouponListQuerySchema,
  type AdminCouponDeleteResponse,
  type AdminCouponListQueryOutput,
  type AdminCouponListResponse,
  type AdminCouponRow,
  couponInputSchema,
  type CouponInput,
  PERMISSIONS,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminCouponsService } from './admin-coupons.service.js'

@Controller('admin/coupons')
@RequirePermission(PERMISSIONS.promotions.manage)
export class AdminCouponsController {
  constructor(private readonly couponsService: AdminCouponsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.promotions.manage)
  async list(
    @Query(new ZodValidationPipe(adminCouponListQuerySchema))
    query: AdminCouponListQueryOutput,
  ): Promise<AdminCouponListResponse> {
    return this.couponsService.list(query)
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.promotions.manage)
  async getById(@Param('id') id: string): Promise<AdminCouponRow> {
    return this.couponsService.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('coupon')
  async create(
    @Body(new ZodValidationPipe(couponInputSchema))
    body: CouponInput,
  ): Promise<AdminCouponRow> {
    return this.couponsService.create(body)
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('coupon')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(couponInputSchema))
    body: CouponInput,
  ): Promise<AdminCouponRow> {
    return this.couponsService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('coupon')
  async delete(@Param('id') id: string): Promise<AdminCouponDeleteResponse> {
    return this.couponsService.delete(id)
  }
}
