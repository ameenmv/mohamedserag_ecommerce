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
  adminFlashSaleListQuerySchema,
  type AdminFlashSaleDetail,
  type AdminFlashSaleListQueryOutput,
  type AdminFlashSaleListResponse,
  flashSaleInputSchema,
  type FlashSaleInput,
  PERMISSIONS,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminFlashSalesService } from './admin-flash-sales.service.js'

@Controller('admin/flash-sales')
@RequirePermission(PERMISSIONS.promotions.manage)
export class AdminFlashSalesController {
  constructor(private readonly flashSalesService: AdminFlashSalesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.promotions.manage)
  async list(
    @Query(new ZodValidationPipe(adminFlashSaleListQuerySchema))
    query: AdminFlashSaleListQueryOutput,
  ): Promise<AdminFlashSaleListResponse> {
    return this.flashSalesService.list(query)
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.promotions.manage)
  async getById(@Param('id') id: string): Promise<AdminFlashSaleDetail> {
    return this.flashSalesService.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('flash_sale')
  async create(
    @Body(new ZodValidationPipe(flashSaleInputSchema))
    body: FlashSaleInput,
  ): Promise<AdminFlashSaleDetail> {
    return this.flashSalesService.create(body)
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('flash_sale')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(flashSaleInputSchema))
    body: FlashSaleInput,
  ): Promise<AdminFlashSaleDetail> {
    return this.flashSalesService.update(id, body)
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('flash_sale')
  async endNow(@Param('id') id: string): Promise<AdminFlashSaleDetail> {
    return this.flashSalesService.end(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.promotions.manage)
  @Audit('flash_sale')
  async delete(@Param('id') id: string): Promise<void> {
    await this.flashSalesService.delete(id)
  }
}
