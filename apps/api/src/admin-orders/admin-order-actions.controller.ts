import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  confirmPaymentInputSchema,
  manualStatusTargets,
  orderNotesSchema,
  orderStatusChangeSchema,
  PERMISSIONS,
  rejectPaymentInputSchema,
  whatsappLogSchema,
  type AdminOrderDetail,
  type ConfirmPaymentInput,
  type OrderNotesOutput,
  type OrderStatusChangeInput,
  type RejectPaymentInput,
  type WhatsAppLogOutput,
} from '@serag/shared'
import { type AdminContext, Audit, CurrentAdmin, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AdminOrderDetailService } from './admin-order-detail.service.js'
import { OrderPaymentsService } from './order-payments.service.js'
import { OrderStatusService } from './order-status.service.js'

@Controller('admin/orders')
export class AdminOrderActionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detailService: AdminOrderDetailService,
    private readonly statusService: OrderStatusService,
    private readonly paymentsService: OrderPaymentsService,
  ) {}

  @Get(':id')
  @RequirePermission(PERMISSIONS.orders.read)
  async getDetail(@Param('id') id: string): Promise<AdminOrderDetail> {
    return this.detailService.getDetail(id)
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async changeStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orderStatusChangeSchema)) body: OrderStatusChangeInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminOrderDetail> {
    const current = await this.detailService.getDetail(id)
    const allowed = manualStatusTargets(current.status)

    if (!allowed.includes(body.to)) {
      throw new ConflictException('الحالة دي مش مسموحة للطلب ده')
    }

    const { shortages } = await this.statusService.transitionOrder({
      orderId: id,
      to: body.to,
      userId: admin?.userId,
      note: body.reason,
    })

    const detail = await this.detailService.getDetail(id)
    return { ...detail, shortages }
  }

  @Patch(':id/notes')
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async updateNotes(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orderNotesSchema)) body: OrderNotesOutput,
  ): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    const clean = body.internalNotes.trim()
    await this.prisma.order.update({
      where: { id },
      data: { internalNotes: clean === '' ? null : clean },
    })

    return this.detailService.getDetail(id)
  }

  @Post(':id/payments/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.confirmPayment)
  @Audit('order')
  async confirmPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(confirmPaymentInputSchema)) body: ConfirmPaymentInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminOrderDetail> {
    const { shortages } = await this.paymentsService.confirm(id, body, admin?.userId)
    const detail = await this.detailService.getDetail(id)
    return { ...detail, shortages }
  }

  @Post(':id/payments/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.confirmPayment)
  @Audit('order')
  async rejectPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectPaymentInputSchema)) body: RejectPaymentInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminOrderDetail> {
    await this.paymentsService.reject(id, body, admin?.userId)
    return this.detailService.getDetail(id)
  }

  @Post(':id/whatsapp')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.orders.update)
  @Audit('order')
  async logWhatsapp(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(whatsappLogSchema)) body: WhatsAppLogOutput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    const msg = await this.prisma.whatsAppMessage.create({
      data: {
        orderId: id,
        to: body.to,
        templateKey: body.templateKey,
        variables: body.variables as Prisma.InputJsonValue,
        channel: 'link',
        status: 'opened',
        userId: admin?.userId,
      },
      select: { id: true },
    })

    return { id: msg.id }
  }
}
