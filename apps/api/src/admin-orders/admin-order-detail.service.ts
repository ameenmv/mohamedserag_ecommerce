import { Injectable, NotFoundException } from '@nestjs/common'
import {
  defaultConfirmAmount,
  depositRemaining,
  isPaymentAddable,
  isPaymentConfirmable,
  lockState,
  manualStatusTargets,
  ORDER_STATUS_LABELS,
  remainingAmount,
  type AdminOrderBridalDetail,
  type AdminOrderDetail,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AdminOrderDetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads full order details for administrative display and action responses.
   */
  async getDetail(orderId: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        bridalList: { select: { shareToken: true } },
        items: true,
        payments: {
          include: { user: { select: { name: true } } },
          orderBy: { at: 'desc' },
        },
        events: {
          include: { user: { select: { name: true } } },
          orderBy: { at: 'desc' },
        },
        whatsAppMessages: {
          include: { user: { select: { name: true } } },
          orderBy: { at: 'desc' },
        },
      },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    const rem = remainingAmount(order)
    const isConfirmable = isPaymentConfirmable(order.status)
    const isAddable = isPaymentAddable(order.status)
    const canConfirmPayment = isConfirmable || (isAddable && rem > 0)
    const canRejectPayment = order.status === 'awaiting_payment' || order.status === 'awaiting_deposit'


    const deposit =
      order.depositAmount !== null && order.depositAmount > 0
        ? {
            pct: order.depositPct ?? 0,
            amount: order.depositAmount,
          }
        : null

    const items = order.items.map((item) => ({
      name: item.name,
      modelCode: item.modelCode,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.qty * item.unitPrice,
      taxRate: item.taxRate,
      productId: item.productId,
    }))

    const payments = order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount,
      status: p.status,
      rejectReason: p.rejectReason,
      at: p.at,
      adminName: p.user?.name ?? null,
    }))

    const events = order.events.map((e) => ({
      status: e.status,
      note: e.note,
      at: e.at,
      adminName: e.user?.name ?? null,
    }))

    const whatsappMessages = order.whatsAppMessages.map((w) => ({
      templateKey: w.templateKey,
      at: w.at,
      adminName: w.user?.name ?? null,
    }))

    let bridal: AdminOrderBridalDetail | null = null
    if (order.type === 'bridal') {
      const lockRes = lockState(
        { bridalStatus: order.bridalStatus, lockedUntil: order.lockedUntil },
        new Date(),
      )
      bridal = {
        status: order.bridalStatus ?? null,
        lockDays: order.lockDays ?? null,
        lockedUntil: order.lockedUntil,
        lockExpired: lockRes.expired,
        lockDaysLeft: lockRes.daysLeft,
        preferredDate: order.preferredDate,
        agreedDeliveryDate: order.agreedDeliveryDate,
        listShareToken: order.bridalList?.shareToken ?? null,
      }
    }

    return {
      id: order.id,
      no: order.no,
      type: order.type,
      bridal,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
      createdAt: order.createdAt,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        governorate: order.governorate,
        city: order.city,
        address: order.address,
        notes: order.notes,
      },
      zoneId: order.zoneId,
      items,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
      deposit,
      paidAmount: order.paidAmount,
      remaining: rem,
      depositRemaining: depositRemaining(order),
      payments,
      events,
      whatsappMessages,
      internalNotes: order.internalNotes,
      confirmToken: order.confirmToken,
      allowedTransitions: manualStatusTargets(order.status),
      canConfirmPayment,
      canRejectPayment,
      defaultConfirmAmount: defaultConfirmAmount(order),
    }
  }
}
