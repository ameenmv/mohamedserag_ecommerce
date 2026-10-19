import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  buildBridalReserveQuote,
  findZone,
  parseStoredRooms,
  priceRooms,
  type BridalReserveInput,
  type BridalReserveQuote,
  type BridalReserveQuoteQuery,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { nextOrderNo } from '../orders/order-number.js'
import { loadBridalProducts } from './bridal-products.js'

@Injectable()
export class BridalReserveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  async getReserveQuote(
    token: string,
    query: BridalReserveQuoteQuery,
  ): Promise<BridalReserveQuote> {
    const list = await this.prisma.bridalList.findFirst({
      where: {
        OR: [{ editToken: token }, { shareToken: token }],
      },
    })

    if (!list) {
      throw new NotFoundException('القايمة دي مش موجودة')
    }

    if (list.shareToken === token && list.editToken !== token) {
      throw new ForbiddenException('اللينك ده للعرض بس')
    }

    if (list.status !== 'draft') {
      throw new ConflictException('القايمة اتحجزت ومينفعش تتعدل')
    }

    const storedRooms = parseStoredRooms(list.rooms)
    const productIds = storedRooms.flatMap((r) => r.items.map((i) => i.productId))
    const productsMap = await loadBridalProducts(this.prisma, productIds)
    const priced = priceRooms(storedRooms, productsMap)

    const [zones, settings] = await Promise.all([
      this.settingsService.getZones(),
      this.settingsService.getBridal(),
    ])

    const zone = findZone(zones, query.governorate, query.city)
    return buildBridalReserveQuote(priced, zone, settings)
  }

  async reserve(
    token: string,
    input: BridalReserveInput,
  ): Promise<{ orderNo: string; publicToken: string; isNew: boolean }> {
    // Idempotency first: a retried request gets the same reservation back.
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { no: true, publicToken: true },
    })
    if (existing) {
      return { orderNo: existing.no, publicToken: existing.publicToken, isNew: false }
    }

    // The schema only accepts transfer methods; the method must also be enabled in settings.

    const payments = await this.settingsService.getPayments()
    const methodSetting = payments.methods[input.paymentMethod]
    if (!methodSetting || !methodSetting.enabled) {
      throw new BadRequestException('طريقة الدفع دي مش متاحة')
    }

    const [zones, bridalSettings] = await Promise.all([
      this.settingsService.getZones(),
      this.settingsService.getBridal(),
    ])

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const existingInTx = await tx.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { no: true, publicToken: true },
        })
        if (existingInTx) {
          return { orderNo: existingInTx.no, publicToken: existingInTx.publicToken, isNew: false }
        }

        // Lock the list row first, then read it: a concurrent reserve with another key waits here
        // and sees the non-draft status instead of creating a second reservation.
        const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM bridal_lists WHERE edit_token = ${token} OR share_token = ${token} FOR UPDATE`
        const lockedId = lockedRows[0]?.id
        if (!lockedId) {
          throw new NotFoundException('القايمة دي مش موجودة')
        }
        const listByToken = await tx.bridalList.findUniqueOrThrow({ where: { id: lockedId } })
        if (listByToken.editToken !== token) {
          throw new ForbiddenException('اللينك ده للعرض بس')
        }
        if (listByToken.status !== 'draft') {
          throw new ConflictException({
            code: 'NOT_DRAFT',
            message: 'القايمة اتحجزت قبل كده',
          })
        }

        const storedRooms = parseStoredRooms(listByToken.rooms)
        const productIds = storedRooms.flatMap((r) => r.items.map((i) => i.productId))
        const productsMap = await loadBridalProducts(tx, productIds)
        const priced = priceRooms(storedRooms, productsMap)

        if (priced.itemCount === 0 || priced.unavailable > 0) {
          throw new ConflictException({
            code: 'UNAVAILABLE',
            message: 'فيه منتجات نفذت، بدّليها أو شيليها',
          })
        }

        const zone = findZone(zones, input.customer.governorate, input.customer.city)
        const quote = buildBridalReserveQuote(priced, zone, bridalSettings)

        if (quote.total !== input.expectedTotal) {
          throw new ConflictException({
            code: 'PRICE_CHANGED',
            message: 'الأسعار اتغيرت، راجعي الإجمالي الجديد',
            quote,
          })
        }

        const orderNo = await nextOrderNo(tx)
        const publicToken = nanoid(24)
        const confirmToken = nanoid(24)

        const preferredDate = input.preferredDate
          ? new Date(`${input.preferredDate}T12:00:00.000Z`)
          : null

        const orderItemsData = priced.rooms.flatMap((room) =>
          room.items
            .filter((item) => item.available)
            .map((line) => {
              const p = productsMap.get(line.productId)
              return {
                productId: line.productId,
                name: line.name,
                modelCode: line.modelCode,
                qty: line.qty,
                unitPrice: line.unitPrice,
                taxRate: p?.taxRate ?? 14,
              }
            }),
        )

        const created = await tx.order.create({
          data: {
            no: orderNo,
            type: 'bridal',
            status: 'awaiting_deposit',
            bridalStatus: 'awaiting_deposit',
            customerPhone: input.customer.phone,
            customerName: input.customer.name,
            governorate: input.customer.governorate,
            city: input.customer.city,
            zoneId: zone.id,
            address: input.customer.address,
            notes: input.customer.notes ?? null,
            subtotal: quote.subtotal,
            discount: 0,
            deliveryFee: quote.deliveryFee,
            total: quote.total,
            couponId: null,
            paymentMethod: input.paymentMethod,
            depositPct: quote.depositPct,
            depositAmount: quote.depositAmount,
            paidAmount: 0,
            lockDays: quote.lockDays,
            preferredDate,
            bridalListId: listByToken.id,
            idempotencyKey: input.idempotencyKey,
            publicToken,
            confirmToken,
            items: { create: orderItemsData },
            events: {
              create: [
                {
                  status: 'awaiting_deposit',
                  note: 'حجز جهاز العروسة',
                  userId: null,
                },
              ],
            },
          },
          select: { no: true, publicToken: true },
        })

        await tx.bridalList.update({
          where: { id: listByToken.id },
          data: {
            status: 'awaiting_deposit',
            customerName: input.customer.name,
            customerPhone: input.customer.phone,
          },
        })

        return { orderNo: created.no, publicToken: created.publicToken, isNew: true }
      })

      return txResult
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { no: true, publicToken: true },
        })
        if (raced) {
          return { orderNo: raced.no, publicToken: raced.publicToken, isNew: false }
        }
      }
      throw err
    }
  }
}
