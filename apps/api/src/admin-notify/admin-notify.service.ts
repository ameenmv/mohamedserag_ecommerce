import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  type AdminNotifyEntry,
  type AdminNotifyMarkSentResponse,
  type AdminNotifyProductDetail,
  type AdminNotifyProductRow,
  DEFAULT_TEMPLATES,
  deriveAvailability,
  renderTemplate,
  waLink,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'

@Injectable()
export class AdminNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  /**
   * Retrieves products that have at least one notify-me request.
   * Aggregates waiting and sent counts in a single grouped query (no N+1).
   * Orders restocked products (available with waiting > 0) first,
   * then by waiting count desc, then by lastRequestAt desc.
   */
  async list(): Promise<AdminNotifyProductRow[]> {
    const grouped = await this.prisma.notifyRequest.groupBy({
      by: ['productId', 'status'],
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    })

    if (grouped.length === 0) {
      return []
    }

    interface ProductAgg {
      waiting: number
      sent: number
      lastRequestAt: Date
    }
    const aggMap = new Map<string, ProductAgg>()

    for (const g of grouped) {
      let item = aggMap.get(g.productId)
      if (!item) {
        item = {
          waiting: 0,
          sent: 0,
          lastRequestAt: g._max.updatedAt ?? new Date(0),
        }
        aggMap.set(g.productId, item)
      }
      if (g.status === 'waiting') {
        item.waiting += g._count._all
      } else if (g.status === 'sent') {
        item.sent += g._count._all
      }
      if (g._max.updatedAt && g._max.updatedAt > item.lastRequestAt) {
        item.lastRequestAt = g._max.updatedAt
      }
    }

    const productIds = Array.from(aggMap.keys())
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        modelCode: true,
        slug: true,
        stock: true,
        lowStockThreshold: true,
        availabilityMode: true,
      },
    })

    const rows: AdminNotifyProductRow[] = []
    for (const p of products) {
      const agg = aggMap.get(p.id)
      if (!agg) continue

      const avail = deriveAvailability({
        mode: p.availabilityMode,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      })
      const available = avail.state === 'in_stock' || avail.state === 'low'

      rows.push({
        product: {
          id: p.id,
          name: p.name,
          modelCode: p.modelCode,
          slug: p.slug,
          stock: p.stock,
          available,
        },
        waiting: agg.waiting,
        sent: agg.sent,
        lastRequestAt: agg.lastRequestAt.toISOString(),
      })
    }

    rows.sort((a, b) => {
      const aPrio = a.product.available && a.waiting > 0 ? 1 : 0
      const bPrio = b.product.available && b.waiting > 0 ? 1 : 0
      if (aPrio !== bPrio) {
        return bPrio - aPrio
      }
      if (b.waiting !== a.waiting) {
        return b.waiting - a.waiting
      }
      return new Date(b.lastRequestAt).getTime() - new Date(a.lastRequestAt).getTime()
    })

    return rows
  }

  /**
   * Retrieves the detail of a product's waiting list and entries, newest updatedAt first.
   */
  async getDetail(productId: string): Promise<AdminNotifyProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        modelCode: true,
        slug: true,
        stock: true,
        lowStockThreshold: true,
        availabilityMode: true,
      },
    })

    if (!product) {
      throw new NotFoundException('المنتج مش موجود')
    }

    const avail = deriveAvailability({
      mode: product.availabilityMode,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    })
    const available = avail.state === 'in_stock' || avail.state === 'low'

    const entries = await this.prisma.notifyRequest.findMany({
      where: { productId },
      orderBy: { updatedAt: 'desc' },
    })

    const mappedEntries: AdminNotifyEntry[] = entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      phone: entry.phone,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      sentAt: entry.sentAt ? entry.sentAt.toISOString() : null,
    }))

    return {
      product: {
        id: product.id,
        name: product.name,
        modelCode: product.modelCode,
        slug: product.slug,
        stock: product.stock,
        available,
      },
      entries: mappedEntries,
    }
  }

  /**
   * Marks a notify request sent, generates the prefilled WhatsApp link,
   * and records a WhatsAppMessage opened audit log in a single transaction.
   * Only allowed when the product is available in stock.
   */
  async markSent(id: string, userId?: string | null): Promise<AdminNotifyMarkSentResponse> {
    const entry = await this.prisma.notifyRequest.findUnique({
      where: { id },
      include: {
        product: true,
      },
    })

    if (!entry) {
      throw new NotFoundException('الطلب مش موجود')
    }

    const avail = deriveAvailability({
      mode: entry.product.availabilityMode,
      stock: entry.product.stock,
      lowStockThreshold: entry.product.lowStockThreshold,
    })
    const available = avail.state === 'in_stock' || avail.state === 'low'

    if (!available) {
      throw new ConflictException('المنتج لسه مش متوفر')
    }

    const templates = await this.settingsService.getTemplates()
    const template = templates.notify_back_in_stock ?? DEFAULT_TEMPLATES.notify_back_in_stock

    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000'
    const productUrl = `${webOrigin}/p/${entry.product.slug}`
    const templateVars = {
      customerName: entry.name,
      productName: entry.product.name,
      productUrl,
    }

    const text = renderTemplate(template, templateVars)
    const whatsappUrl = waLink(entry.phone, text)

    const now = new Date()
    const [updatedEntry] = await this.prisma.$transaction([
      this.prisma.notifyRequest.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: now,
        },
      }),
      this.prisma.whatsAppMessage.create({
        data: {
          orderId: null,
          to: entry.phone,
          templateKey: 'notify_back_in_stock',
          variables: templateVars,
          channel: 'link',
          status: 'opened',
          userId: userId ?? null,
        },
      }),
    ])

    return {
      whatsappUrl,
      entry: {
        id: updatedEntry.id,
        name: updatedEntry.name,
        phone: updatedEntry.phone,
        status: updatedEntry.status,
        createdAt: updatedEntry.createdAt.toISOString(),
        updatedAt: updatedEntry.updatedAt.toISOString(),
        sentAt: updatedEntry.sentAt ? updatedEntry.sentAt.toISOString() : null,
      },
    }
  }
}
