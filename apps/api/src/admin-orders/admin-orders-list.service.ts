import { Injectable } from '@nestjs/common'
import {
  normalizePhone,
  type AdminOrderListQueryOutput,
  type AdminOrderListResponse,
  type AdminOrderRow,
  type OrderStatus,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AdminOrdersListService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds the base WHERE filter from query parameters excluding the status filter.
   * This base filter is shared between the status counts calculation and the items query.
   */
  buildBaseWhere(
    query: Pick<AdminOrderListQueryOutput, 'paymentMethod' | 'from' | 'to' | 'q'>,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {}

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod
    }

    if (query.from || query.to) {
      const createdAt: Prisma.DateTimeFilter = {}
      if (query.from) {
        createdAt.gte = new Date(`${query.from}T00:00:00.000Z`)
      }
      if (query.to) {
        createdAt.lte = new Date(`${query.to}T23:59:59.999Z`)
      }
      where.createdAt = createdAt
    }

    if (query.q && query.q.trim().length > 0) {
      const q = query.q.trim()
      const orConditions: Prisma.OrderWhereInput[] = [
        { no: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ]

      const normalizedPhone = normalizePhone(q)
      if (normalizedPhone) {
        orConditions.push({ customerPhone: { contains: normalizedPhone } })
      } else {
        // Partial number search (e.g. last digits of a phone, typed with Arabic digits).
        // Only when the query IS a number: pulling digits out of mixed text like «SR-2026-AB12»
        // would match unrelated orders.
        const compact = q
          .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
          .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
          .replace(/[\s\-+()]/g, '')

        if (/^\d{3,}$/.test(compact)) {
          orConditions.push({ customerPhone: { contains: compact } })
          if (compact !== q) {
            orConditions.push({ no: { contains: compact, mode: 'insensitive' } })
          }
        }
      }

      where.OR = orConditions
    }

    return where
  }

  /**
   * Lists orders with filters, search, pagination, and status tab counts.
   */
  async list(query: AdminOrderListQueryOutput): Promise<AdminOrderListResponse> {
    const baseWhere = this.buildBaseWhere(query)

    // Status counts ignore the current status filter but respect all other active filters
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { status: true },
    })

    const counts: Record<OrderStatus, number> = {
      new: 0,
      awaiting_payment: 0,
      awaiting_deposit: 0,
      payment_rejected: 0,
      confirmed: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    }

    for (const row of grouped) {
      if (row.status in counts) {
        counts[row.status] = row._count.status
      }
    }

    const listWhere: Prisma.OrderWhereInput = { ...baseWhere }
    if (query.status) {
      listWhere.status = query.status
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: listWhere }),
      this.prisma.order.findMany({
        where: listWhere,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
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
      }),
    ])

    const items: AdminOrderRow[] = orders.map((o) => ({
      id: o.id,
      no: o.no,
      createdAt: o.createdAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      governorate: o.governorate,
      city: o.city,
      itemCount: o.items.reduce((sum, item) => sum + item.qty, 0),
      total: o.total,
      paidAmount: o.paidAmount,
      paymentMethod: o.paymentMethod,
      status: o.status,
    }))

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts,
    }
  }
}
