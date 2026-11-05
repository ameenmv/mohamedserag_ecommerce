import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  buildAdminOrderMessage,
  buildRestockMessage,
  deriveAvailability,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { WHATSAPP_SENDER, type WhatsAppSender } from './whatsapp-sender.js'

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return `***${phone.slice(-4)}`
}

@Injectable()
export class WhatsAppAlertsService {
  private readonly logger = new Logger(WhatsAppAlertsService.name)
  private readonly inFlightRequests = new Set<string>()

  /** Sequential delay between restock messages in ms to look human and avoid rate limits. */
  public restockDelayMs = 1500

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
    @Inject(WHATSAPP_SENDER) private readonly sender: WhatsAppSender,
  ) {}

  /**
   * Notifies all configured store admins of a newly placed order.
   * Runs in the background after the order transaction commits.
   * Never throws errors to the caller.
   */
  async notifyAdminsOfNewOrder(orderId: string): Promise<void> {
    try {
      const settings = await this.settingsService.getWhatsappAlerts()
      if (!settings.enabled || !this.sender.isConfigured() || settings.adminNumbers.length === 0) {
        return
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (!order) {
        this.logger.warn(`Order ${orderId} not found for WhatsApp alert`)
        return
      }

      const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000'
      const messageText = buildAdminOrderMessage({
        id: order.id,
        no: order.no,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        governorate: order.governorate,
        city: order.city,
        address: order.address,
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        items: order.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          unitPrice: it.unitPrice,
          lineTotal: it.unitPrice * it.qty,
        })),
        webOrigin,
      })

      const templateVars = {
        orderId: order.id,
        orderNo: order.no,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
      }

      for (const adminPhone of settings.adminNumbers) {
        try {
          await this.sender.send(adminPhone, messageText)

          await this.prisma.whatsAppMessage.create({
            data: {
              orderId: order.id,
              to: adminPhone,
              templateKey: 'admin_new_order',
              variables: templateVars as Prisma.InputJsonValue,
              channel: 'open_wa',
              status: 'sent',
            },
          })

          this.logger.log(`Admin order alert sent for #${order.no} to ${maskPhone(adminPhone)}`)
        } catch (sendErr) {
          this.logger.error(
            `Failed to send admin order alert for #${order.no} to ${maskPhone(adminPhone)}`,
            sendErr instanceof Error ? sendErr.message : String(sendErr),
          )

          await this.prisma.whatsAppMessage.create({
            data: {
              orderId: order.id,
              to: adminPhone,
              templateKey: 'admin_new_order',
              variables: {
                ...templateVars,
                error: sendErr instanceof Error ? sendErr.message : String(sendErr),
              } as Prisma.InputJsonValue,
              channel: 'open_wa',
              status: 'failed',
            },
          }).catch((logErr) => {
            this.logger.error('Failed to record failed WhatsAppMessage', logErr)
          })
        }
      }
    } catch (err) {
      this.logger.error(
        'Error in notifyAdminsOfNewOrder',
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  /**
   * Notifies all waiting shoppers when a product's stock becomes available.
   * Runs in the background after the restock transaction commits.
   * Never throws errors to the caller.
   */
  async notifyRestock(productId: string): Promise<void> {
    try {
      const settings = await this.settingsService.getWhatsappAlerts()
      if (!settings.enabled || !this.sender.isConfigured()) {
        return
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          stock: true,
          lowStockThreshold: true,
          availabilityMode: true,
          visible: true,
          archivedAt: true,
        },
      })

      if (!product || !product.visible || product.archivedAt !== null) {
        return
      }

      const avail = deriveAvailability({
        mode: product.availabilityMode,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
      })

      const isAvailable = avail.state === 'in_stock' || avail.state === 'low'
      if (!isAvailable) {
        return
      }

      const requests = await this.prisma.notifyRequest.findMany({
        where: {
          productId,
          status: 'waiting',
        },
        orderBy: { createdAt: 'asc' },
      })

      if (requests.length === 0) {
        return
      }

      const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000'
      const productUrl = `${webOrigin.replace(/\/$/, '')}/p/${product.slug}`
      const messageText = buildRestockMessage({
        productName: product.name,
        url: productUrl,
      })

      for (let i = 0; i < requests.length; i++) {
        const req = requests[i]!

        // In-flight guard: prevent concurrent execution from double-sending
        if (this.inFlightRequests.has(req.id)) {
          continue
        }
        this.inFlightRequests.add(req.id)

        try {
          // Re-read row to ensure it hasn't been sent or modified
          const fresh = await this.prisma.notifyRequest.findUnique({
            where: { id: req.id },
            select: { status: true, phone: true },
          })
          if (!fresh || fresh.status !== 'waiting') {
            continue
          }

          const templateVars = {
            productName: product.name,
            productUrl,
          }

          try {
            await this.sender.send(req.phone, messageText)

            const now = new Date()
            await this.prisma.$transaction([
              this.prisma.notifyRequest.update({
                where: { id: req.id },
                data: {
                  status: 'sent',
                  sentAt: now,
                },
              }),
              this.prisma.whatsAppMessage.create({
                data: {
                  to: req.phone,
                  templateKey: 'notify_restock',
                  variables: templateVars as Prisma.InputJsonValue,
                  channel: 'open_wa',
                  status: 'sent',
                },
              }),
            ])

            this.logger.log(
              `Restock alert sent for product ${product.id} to ${maskPhone(req.phone)}`,
            )
          } catch (sendErr) {
            this.logger.error(
              `Failed to send restock alert for product ${product.id} to ${maskPhone(req.phone)}`,
              sendErr instanceof Error ? sendErr.message : String(sendErr),
            )

            await this.prisma.whatsAppMessage.create({
              data: {
                to: req.phone,
                templateKey: 'notify_restock',
                variables: {
                  ...templateVars,
                  error: sendErr instanceof Error ? sendErr.message : String(sendErr),
                } as Prisma.InputJsonValue,
                channel: 'open_wa',
                status: 'failed',
              },
            }).catch((logErr) => {
              this.logger.error('Failed to record failed WhatsAppMessage', logErr)
            })
            // Request stays in status: 'waiting'
          }
        } finally {
          this.inFlightRequests.delete(req.id)
        }

        if (i < requests.length - 1 && this.restockDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.restockDelayMs))
        }
      }
    } catch (err) {
      this.logger.error('Error in notifyRestock', err instanceof Error ? err.message : String(err))
    }
  }
}
