import { describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service.js'
import type { StoreSettingsService } from '../settings/store-settings.service.js'
import { WhatsAppAlertsService } from './whatsapp-alerts.service.js'
import type { WhatsAppSender } from './whatsapp-sender.js'

const ORDER = {
  id: 'o1',
  no: 'SRG-1001',
  customerName: 'أحمد',
  customerPhone: '01012345678',
  governorate: 'الدقهلية',
  city: 'المنصورة',
  address: 'شارع الجمهورية',
  subtotal: 1000000,
  discount: 0,
  deliveryFee: 5000,
  total: 1005000,
  paymentMethod: 'cod',
  notes: null,
  items: [{ name: 'ثلاجة', qty: 1, unitPrice: 1000000 }],
}

const PRODUCT = {
  id: 'p1',
  name: 'ثلاجة سامسونج',
  slug: 'samsung-fridge',
  stock: 5,
  lowStockThreshold: 3,
  availabilityMode: 'auto',
  visible: true,
  archivedAt: null,
}

function build(opts: {
  enabled?: boolean
  configured?: boolean
  numbers?: string[]
  sendImpl?: (to: string, text: string) => Promise<void>
  product?: typeof PRODUCT | null
  requests?: { id: string; phone: string; status: string }[]
}) {
  const sent: { to: string; text: string }[] = []
  const sender: WhatsAppSender = {
    isConfigured: () => opts.configured ?? true,
    send: opts.sendImpl ?? (async (to, text) => {
      sent.push({ to, text })
    }),
  }
  const requests = opts.requests ?? []
  const messageRows: { status: string; templateKey: string }[] = []
  const updates: { id: string; status: string; sentAt: Date | undefined }[] = []
  const prisma = {
    order: { findUnique: vi.fn(async () => ORDER) },
    product: { findUnique: vi.fn(async () => (opts.product === undefined ? PRODUCT : opts.product)) },
    notifyRequest: {
      findMany: vi.fn(async () => requests.filter((r) => r.status === 'waiting')),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => requests.find((r) => r.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: string; sentAt: Date } }) => {
        const r = requests.find((x) => x.id === where.id)
        if (r) r.status = data.status
        updates.push({ id: where.id, status: data.status, sentAt: data.sentAt })
        return r
      }),
    },
    whatsAppMessage: {
      create: vi.fn(async ({ data }: { data: { status: string; templateKey: string } }) => {
        messageRows.push({ status: data.status, templateKey: data.templateKey })
        return data
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  }
  const settings = {
    getWhatsappAlerts: vi.fn(async () => ({
      enabled: opts.enabled ?? true,
      adminNumbers: opts.numbers ?? ['01000000001', '01000000002'],
    })),
  }
  const service = new WhatsAppAlertsService(
    prisma as unknown as PrismaService,
    settings as unknown as StoreSettingsService,
    sender,
  )
  service.restockDelayMs = 0
  return { service, sent, messageRows, updates, requests }
}

describe('WhatsAppAlertsService.notifyAdminsOfNewOrder', () => {
  it('sends one message per admin number and logs each as sent', async () => {
    const { service, sent, messageRows } = build({})
    await service.notifyAdminsOfNewOrder('o1')
    expect(sent).toHaveLength(2)
    expect(sent[0]?.text).toContain('SRG-1001')
    expect(messageRows.map((r) => r.status)).toEqual(['sent', 'sent'])
  })

  it('does nothing when disabled or when the sender is not configured', async () => {
    const a = build({ enabled: false })
    await a.service.notifyAdminsOfNewOrder('o1')
    expect(a.sent).toHaveLength(0)
    expect(a.messageRows).toHaveLength(0)

    const b = build({ configured: false })
    await b.service.notifyAdminsOfNewOrder('o1')
    expect(b.sent).toHaveLength(0)
    expect(b.messageRows).toHaveLength(0)
  })

  it('never throws when the sender fails and records a failed row', async () => {
    const { service, messageRows } = build({
      sendImpl: async () => {
        throw new Error('down')
      },
    })
    await expect(service.notifyAdminsOfNewOrder('o1')).resolves.toBeUndefined()
    expect(messageRows.map((r) => r.status)).toEqual(['failed', 'failed'])
  })
})

describe('WhatsAppAlertsService.notifyRestock', () => {
  it('messages a waiting request once and marks it sent', async () => {
    const { service, sent, updates, requests } = build({
      requests: [{ id: 'r1', phone: '01111111111', status: 'waiting' }],
    })
    await service.notifyRestock('p1')
    expect(sent).toHaveLength(1)
    expect(sent[0]?.text).toContain('samsung-fridge')
    expect(updates[0]?.status).toBe('sent')
    expect(updates[0]?.sentAt).toBeInstanceOf(Date)
    expect(requests[0]?.status).toBe('sent')
  })

  it('leaves the request waiting when the send fails', async () => {
    const { service, requests, messageRows } = build({
      sendImpl: async () => {
        throw new Error('down')
      },
      requests: [{ id: 'r1', phone: '01111111111', status: 'waiting' }],
    })
    await service.notifyRestock('p1')
    expect(requests[0]?.status).toBe('waiting')
    expect(messageRows.map((r) => r.status)).toEqual(['failed'])
  })

  it('does not double-send when triggered twice at once', async () => {
    const { service, sent } = build({
      requests: [{ id: 'r1', phone: '01111111111', status: 'waiting' }],
    })
    await Promise.all([service.notifyRestock('p1'), service.notifyRestock('p1')])
    expect(sent).toHaveLength(1)
  })

  it('sends nothing for a product that is still out of stock', async () => {
    const { service, sent } = build({
      product: { ...PRODUCT, stock: 0 },
      requests: [{ id: 'r1', phone: '01111111111', status: 'waiting' }],
    })
    await service.notifyRestock('p1')
    expect(sent).toHaveLength(0)
  })
})
