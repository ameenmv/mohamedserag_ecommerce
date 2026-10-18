import { Injectable } from '@nestjs/common'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  piastresToEgp,
  type AdminOrderListQueryOutput,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AdminOrdersListService } from './admin-orders-list.service.js'

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes(';') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

@Injectable()
export class AdminOrdersExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listService: AdminOrdersListService,
  ) {}

  /**
   * Generates a UTF-8 BOM CSV export of orders matching the active list filters (capped at 5000 rows).
   * Formats money in EGP with Arabic status and payment method labels.
   */
  async exportOrdersCsv(
    query: AdminOrderListQueryOutput,
  ): Promise<{ csv: string; filename: string }> {
    const where: Prisma.OrderWhereInput = this.listService.buildBaseWhere(query)
    if (query.status) {
      where.status = query.status
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: {
        no: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        governorate: true,
        city: true,
        total: true,
        paidAmount: true,
        paymentMethod: true,
        status: true,
        items: {
          select: { qty: true },
        },
      },
    })

    const header =
      'رقم الطلب,التاريخ,العميل,الموبايل,المحافظة,المدينة,عدد القطع,الإجمالي (ج.م),المدفوع (ج.م),طريقة الدفع,الحالة'
    const lines = [header]

    for (const order of orders) {
      const itemCount = order.items.reduce((acc, it) => acc + it.qty, 0)
      const dateStr = order.createdAt.toISOString().slice(0, 10)
      const totalEgp = piastresToEgp(order.total)
      const paidEgp = piastresToEgp(order.paidAmount)
      const methodLabel = PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod
      const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status

      const row = [
        escapeCsvCell(order.no),
        escapeCsvCell(dateStr),
        escapeCsvCell(order.customerName),
        escapeCsvCell(order.customerPhone),
        escapeCsvCell(order.governorate),
        escapeCsvCell(order.city),
        escapeCsvCell(itemCount),
        escapeCsvCell(totalEgp),
        escapeCsvCell(paidEgp),
        escapeCsvCell(methodLabel),
        escapeCsvCell(statusLabel),
      ].join(',')
      lines.push(row)
    }

    const today = new Date().toISOString().slice(0, 10)
    const filename = `orders-${today}.csv`
    const csvWithBom = `\uFEFF${lines.join('\r\n')}\r\n`

    return {
      csv: csvWithBom,
      filename,
    }
  }
}
