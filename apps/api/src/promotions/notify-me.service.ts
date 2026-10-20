import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { deriveAvailability, type NotifyMeInput } from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class NotifyMeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a shopper's back-in-stock notification request.
   * Silently accepts filled honeypots without writing to the database.
   * Only permits requests on existing, visible, unarchived, out-of-stock products.
   * Upserts one unique row per (productId, phone) and resets status to waiting on repeat.
   */
  async requestNotification(body: NotifyMeInput): Promise<{ ok: true }> {
    if (body.website && body.website.trim().length > 0) {
      return { ok: true }
    }

    const product = await this.prisma.product.findUnique({
      where: { id: body.productId },
      select: {
        id: true,
        visible: true,
        archivedAt: true,
        stock: true,
        lowStockThreshold: true,
        availabilityMode: true,
      },
    })

    if (!product || !product.visible || product.archivedAt !== null) {
      throw new NotFoundException('المنتج مش موجود')
    }

    const avail = deriveAvailability({
      mode: product.availabilityMode,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    })

    if (avail.state !== 'out') {
      throw new ConflictException('المنتج متوفر دلوقتي')
    }

    await this.prisma.notifyRequest.upsert({
      where: {
        productId_phone: {
          productId: body.productId,
          phone: body.phone,
        },
      },
      create: {
        productId: body.productId,
        phone: body.phone,
        name: body.name,
        status: 'waiting',
      },
      update: {
        name: body.name,
        status: 'waiting',
        sentAt: null,
      },
    })

    return { ok: true }
  }
}
