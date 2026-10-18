import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import {
  cairoToday,
  confirmPaymentInputSchema,
  defaultConfirmAmount,
  depositRemaining,
  DEFAULT_TEMPLATES,
  isPaymentConfirmable,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  rejectPaymentInputSchema,
  renderTemplate,
  waLink,
  PERMISSIONS,
  type AdminConfirmSummary,
  type ConfirmPaymentInput,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type RejectPaymentInput,
} from '@serag/shared'
import { type AdminContext, Audit, CurrentAdmin, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { OrderPaymentsService } from './order-payments.service.js'

function toConfirmSummary(order: {
  id: string
  no: string
  type: OrderType
  status: OrderStatus
  customerName: string
  total: number
  paidAmount: number
  paymentMethod: PaymentMethod
  depositAmount: number | null
  depositPct: number | null
  lockDays: number | null
  lockedUntil: Date | null
}): AdminConfirmSummary {
  const canConfirm = isPaymentConfirmable(order.status)
  const canReject = order.status === 'awaiting_payment' || order.status === 'awaiting_deposit'
  const customerFirstName = order.customerName.trim().split(/\s+/)[0] ?? order.customerName

  const depositRem =
    order.depositAmount !== null && order.depositAmount > 0
      ? depositRemaining({ depositAmount: order.depositAmount, paidAmount: order.paidAmount })
      : undefined

  const deposit =
    order.depositAmount !== null && order.depositAmount > 0
      ? {
          pct: order.depositPct ?? 0,
          amount: order.depositAmount,
          paid: order.paidAmount,
          required: order.depositAmount,
          remaining: depositRem ?? 0,
        }
      : null

  const locked = order.lockedUntil ? { lockedUntil: order.lockedUntil } : null

  return {
    orderId: order.id,
    no: order.no,
    type: order.type,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
    customerFirstName,
    total: order.total,
    paidAmount: order.paidAmount,
    expectedAmount: defaultConfirmAmount(order),
    method: order.paymentMethod,
    methodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod,
    deposit,
    depositAmount: order.depositAmount,
    depositRemaining: depositRem,
    lockDays: order.lockDays ?? null,
    locked,
    canConfirm,
    canReject,
  }
}

@Controller('admin/confirm')
export class AdminConfirmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: OrderPaymentsService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  @Get(':token')
  @RequirePermission(PERMISSIONS.orders.confirmPayment)
  async getSummary(@Param('token') token: string): Promise<AdminConfirmSummary> {
    const order = await this.prisma.order.findUnique({
      where: { confirmToken: token },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    return toConfirmSummary(order)
  }

  @Post(':token/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.confirmPayment)
  @Audit('order')
  async confirm(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(confirmPaymentInputSchema)) body: ConfirmPaymentInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminConfirmSummary> {
    const order = await this.prisma.order.findUnique({
      where: { confirmToken: token },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    if (!isPaymentConfirmable(order.status)) {
      throw new ConflictException('مينفعش تأكيد دفع للطلب ده دلوقتي')
    }

    const result = await this.paymentsService.confirm(order.id, body, admin?.userId)

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    })

    const summary = toConfirmSummary(updated)

    let confirmWhatsappUrl: string | undefined
    if (result.locked) {
      const templates = await this.settingsService.getTemplates()
      const template = templates.bridal_locked ?? DEFAULT_TEMPLATES.bridal_locked
      const lockedDateFormatted = cairoToday(new Date(result.locked.lockedUntil))
      const text = renderTemplate(template, {
        customerName: updated.customerName,
        orderNo: updated.no,
        date: lockedDateFormatted,
        lockedUntil: lockedDateFormatted,
      })
      confirmWhatsappUrl = waLink(updated.customerPhone, text)
    }

    return {
      ...summary,
      shortages: result.shortages,
      deposit: result.deposit
        ? {
            ...summary.deposit,
            ...result.deposit,
            pct: summary.deposit?.pct ?? 0,
            amount: summary.deposit?.amount ?? result.deposit.required,
          }
        : summary.deposit,
      locked: result.locked ?? summary.locked,
      ...(confirmWhatsappUrl ? { confirmWhatsappUrl } : {}),
    }
  }

  @Post(':token/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.orders.confirmPayment)
  @Audit('order')
  async reject(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(rejectPaymentInputSchema)) body: RejectPaymentInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminConfirmSummary> {
    const order = await this.prisma.order.findUnique({
      where: { confirmToken: token },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    if (order.status !== 'awaiting_payment' && order.status !== 'awaiting_deposit') {
      throw new ConflictException('مينفعش رفض الدفع للطلب ده دلوقتي')
    }

    await this.paymentsService.reject(order.id, body, admin?.userId)

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    })
    const summary = toConfirmSummary(updated)

    const templates = await this.settingsService.getTemplates()
    const template = templates.payment_rejected ?? DEFAULT_TEMPLATES.payment_rejected
    const text = renderTemplate(template, {
      customerName: order.customerName,
      orderNo: order.no,
      reason: body.reason,
    })
    const rejectWhatsappUrl = waLink(order.customerPhone, text)

    return { ...summary, rejectWhatsappUrl }
  }
}
