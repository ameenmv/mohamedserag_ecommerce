import { BadRequestException, Injectable } from '@nestjs/common'
import {
  DEFAULT_ZONES,
  findZone,
  egpToPiastres,
  expandSynonyms,
  OWNER_ROLE_KEY,
  zonesSchema,
} from '@serag/shared'
import argon2 from 'argon2'
import { nanoid } from 'nanoid'
import {
  type AvailabilityMode,
  type OrderStatus,
  type PaymentMethod,
} from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '../auth/session.util.js'
import type {
  SeedAdminSessionInput,
  SeedOrderInput,
  SeedProductInput,
} from './test-seed.dto.js'

const DEFAULT_SEARCH_SYNONYMS: string[][] = [
  ['تلاجه', 'ثلاجة', 'ثلاجه', 'refrigerator', 'fridge'],
  ['غساله', 'غسالة', 'washing', 'washer'],
  ['شاشه', 'شاشة', 'تليفزيون', 'تلفزيون', 'tv'],
  ['تكييف', 'مكيف', 'ac', 'air conditioner'],
  ['بوتاجاز', 'بوتجاز', 'موقد', 'cooker'],
  ['حلل', 'طقم حلل', 'cookware'],
  ['سامسونج', 'samsung'],
  ['إل جي', 'ال جي', 'lg'],
  ['توشيبا', 'toshiba', 'العربي'],
  ['شارب', 'sharp'],
  ['فريش', 'fresh'],
  ['تورنيدو', 'tornado'],
  ['يونيون إير', 'يونيون اير', 'unionaire'],
  ['انفرتر', 'إنفرتر', 'inverter'],
  ['نوفروست', 'نو فروست', 'no frost', 'nofrost'],
  ['ديفروست', 'defrost'],
]

@Injectable()
export class TestSeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedProduct(input: SeedProductInput) {
    const count = await this.prisma.product.count({
      where: { modelCode: { startsWith: `E2E-${input.runId}-` } },
    })
    const n = count + 1
    const modelCode = `E2E-${input.runId}-${n}`
    const slug = `e2e-${input.runId}-${n}`

    let category
    if (input.categorySlug) {
      category = await this.prisma.category.findUnique({
        where: { slug: input.categorySlug },
      })
      if (!category) {
        throw new BadRequestException(`Category not found: ${input.categorySlug}`)
      }
    } else {
      category = await this.prisma.category.findFirst({
        orderBy: { sort: 'asc' },
      })
      if (!category) {
        throw new BadRequestException('No categories found in database')
      }
    }

    let brand
    if (input.brandSlug) {
      brand = await this.prisma.brand.findUnique({
        where: { slug: input.brandSlug },
      })
      if (!brand) {
        throw new BadRequestException(`Brand not found: ${input.brandSlug}`)
      }
    } else {
      brand = await this.prisma.brand.findFirst({
        orderBy: { sort: 'asc' },
      })
      if (!brand) {
        throw new BadRequestException('No brands found in database')
      }
    }

    const price = egpToPiastres(input.priceEgp ?? 1000)
    const oldPrice = input.oldPriceEgp !== undefined ? egpToPiastres(input.oldPriceEgp) : null
    const productName = input.name ?? `منتج اختبار E2E ${n}`

    const synonymsSetting = await this.prisma.setting.findUnique({
      where: { key: 'searchSynonyms' },
    })
    const synonyms = (synonymsSetting?.value as string[][]) ?? DEFAULT_SEARCH_SYNONYMS
    const searchText = expandSynonyms(
      [productName, brand.name, category.name, modelCode].join(' '),
      synonyms,
    )

    const product = await this.prisma.product.create({
      data: {
        slug,
        modelCode,
        name: productName,
        brandId: brand.id,
        categoryId: category.id,
        price,
        oldPrice,
        stock: input.stock ?? 10,
        availabilityMode: (input.availabilityMode as AvailabilityMode) ?? 'auto',
        leadTimeText: input.leadTimeText ?? null,
        visible: input.visible ?? true,
        taxRate: 14,
        searchText,
      },
      select: {
        id: true,
        slug: true,
        modelCode: true,
        price: true,
      },
    })

    return product
  }

  async seedOrder(input: SeedOrderInput) {
    const count = await this.prisma.order.count({
      where: { no: { startsWith: `E2E-${input.runId}-` } },
    })
    const n = count + 1
    const no = `E2E-${input.runId}-${n}`
    const customerPhone = '010' + String(n).padStart(8, '0')

    const productIds = input.items.map((i) => i.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const resolvedItems = input.items.map((line) => {
      const p = productMap.get(line.productId)
      if (!p) {
        throw new BadRequestException(`Product not found: ${line.productId}`)
      }
      return {
        productId: p.id,
        name: p.name,
        modelCode: p.modelCode,
        qty: line.qty,
        unitPrice: p.price,
        taxRate: p.taxRate,
      }
    })

    const governorate = input.governorate ?? 'الدقهلية'
    const city = input.city ?? 'المنصورة'
    const zonesSetting = await this.prisma.setting.findUnique({
      where: { key: 'zones' },
    })
    const parsedZones = zonesSchema.safeParse(zonesSetting?.value)
    const zones = parsedZones.success ? parsedZones.data : DEFAULT_ZONES
    const zone = findZone(zones, governorate, city)
    const deliveryFee = zone.fee

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    const total = subtotal + deliveryFee
    const status: OrderStatus = (input.status as OrderStatus) ?? 'new'
    const publicToken = nanoid(32)
    const confirmToken = nanoid(32)

    const order = await this.prisma.order.create({
      data: {
        no,
        type: 'order',
        status,
        customerPhone,
        customerName: `عميل اختبار E2E ${n}`,
        governorate,
        city,
        zoneId: zone.id,
        address: 'عنوان اختباري',
        subtotal,
        discount: 0,
        deliveryFee,
        total,
        paymentMethod: input.paymentMethod as PaymentMethod,
        paidAmount: status === 'delivered' || status === 'confirmed' ? total : 0,
        publicToken,
        confirmToken,
        items: {
          create: resolvedItems,
        },
        events: {
          create: [
            {
              status,
              note: 'طلب اختباري E2E',
            },
          ],
        },
      },
      select: {
        id: true,
        no: true,
        publicToken: true,
        confirmToken: true,
        total: true,
        status: true,
      },
    })

    return order
  }

  async seedAdminSession(input: SeedAdminSessionInput) {
    const email = `e2e-${input.runId}@test.local`
    const role = await this.prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: {},
      create: { key: OWNER_ROLE_KEY, name: 'مدير المتجر' },
    })

    const dummyHash = await argon2.hash(nanoid(32), { type: argon2.argon2id })
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { active: true },
      create: {
        email,
        name: `مدير اختبار ${input.runId}`,
        passwordHash: dummyHash,
        active: true,
      },
    })

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    })

    const rawToken = nanoid(48)
    const sessionId = hashSessionToken(rawToken)
    const csrfToken = nanoid(32)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
        csrfToken,
        ip: null,
        userAgent: null,
      },
    })

    return {
      cookieName: SESSION_COOKIE_NAME,
      cookieValue: rawToken,
      csrfToken,
      email: user.email,
    }
  }

  async deleteRun(runId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete users and sessions belonging to this run
      const users = await tx.user.findMany({
        where: { email: `e2e-${runId}@test.local` },
        select: { id: true },
      })
      const userIds = users.map((u) => u.id)

      let deletedSessionsCount = 0
      let deletedUsersCount = 0
      if (userIds.length > 0) {
        const sessionsRes = await tx.session.deleteMany({
          where: { userId: { in: userIds } },
        })
        deletedSessionsCount = sessionsRes.count

        await tx.userRole.deleteMany({
          where: { userId: { in: userIds } },
        })
        await tx.auditLog.deleteMany({
          where: { userId: { in: userIds } },
        })
        const usersRes = await tx.user.deleteMany({
          where: { id: { in: userIds } },
        })
        deletedUsersCount = usersRes.count
      }

      // 2. Delete orders belonging to this run
      const orders = await tx.order.findMany({
        where: { no: { startsWith: `E2E-${runId}-` } },
        select: { id: true },
      })
      const orderIds = orders.map((o) => o.id)

      let deletedOrdersCount = 0
      if (orderIds.length > 0) {
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.whatsAppMessage.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.couponRedemption.deleteMany({ where: { orderId: { in: orderIds } } })
        const ordersRes = await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        })
        deletedOrdersCount = ordersRes.count
      }

      // 3. Delete products belonging to this run
      const products = await tx.product.findMany({
        where: {
          OR: [
            { modelCode: { startsWith: `E2E-${runId}-` } },
            { slug: { startsWith: `e2e-${runId}-` } },
          ],
        },
        select: { id: true },
      })
      const productIds = products.map((p) => p.id)

      let deletedProductsCount = 0
      if (productIds.length > 0) {
        // Find and delete any storefront orders created containing products from this test run
        const ordersWithProducts = await tx.order.findMany({
          where: { items: { some: { productId: { in: productIds } } } },
          select: { id: true },
        })
        const orderIdsWithProducts = ordersWithProducts.map((o) => o.id)
        if (orderIdsWithProducts.length > 0) {
          await tx.payment.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.stockMovement.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.whatsAppMessage.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.orderItem.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.couponRedemption.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          const deletedStoreOrdersRes = await tx.order.deleteMany({ where: { id: { in: orderIdsWithProducts } } })
          deletedOrdersCount += deletedStoreOrdersRes.count
        }

        await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } })
        await tx.productImage.deleteMany({ where: { productId: { in: productIds } } })
        await tx.flashSaleItem.deleteMany({ where: { productId: { in: productIds } } })
        await tx.stockMovement.deleteMany({ where: { productId: { in: productIds } } })
        await tx.review.deleteMany({ where: { productId: { in: productIds } } })
        await tx.notifyRequest.deleteMany({ where: { productId: { in: productIds } } })
        const productsRes = await tx.product.deleteMany({
          where: { id: { in: productIds } },
        })
        deletedProductsCount = productsRes.count
      }

      return {
        runId,
        products: deletedProductsCount,
        orders: deletedOrdersCount,
        users: deletedUsersCount,
        sessions: deletedSessionsCount,
      }
    })
  }

  async resetAllE2E() {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete all E2E users and sessions
      const users = await tx.user.findMany({
        where: { email: { startsWith: 'e2e-' } },
        select: { id: true },
      })
      const userIds = users.map((u) => u.id)
      let deletedSessionsCount = 0
      let deletedUsersCount = 0
      if (userIds.length > 0) {
        const sessionsRes = await tx.session.deleteMany({
          where: { userId: { in: userIds } },
        })
        deletedSessionsCount = sessionsRes.count
        await tx.userRole.deleteMany({ where: { userId: { in: userIds } } })
        await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } })
        const usersRes = await tx.user.deleteMany({ where: { id: { in: userIds } } })
        deletedUsersCount = usersRes.count
      }

      // 2. Delete all E2E orders
      const orders = await tx.order.findMany({
        where: { no: { startsWith: 'E2E-' } },
        select: { id: true },
      })
      const orderIds = orders.map((o) => o.id)
      let deletedOrdersCount = 0
      if (orderIds.length > 0) {
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.whatsAppMessage.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
        await tx.couponRedemption.deleteMany({ where: { orderId: { in: orderIds } } })
        const ordersRes = await tx.order.deleteMany({ where: { id: { in: orderIds } } })
        deletedOrdersCount = ordersRes.count
      }

      // 3. Delete all E2E products
      const products = await tx.product.findMany({
        where: {
          OR: [
            { modelCode: { startsWith: 'E2E-' } },
            { slug: { startsWith: 'e2e-' } },
          ],
        },
        select: { id: true },
      })
      const productIds = products.map((p) => p.id)
      let deletedProductsCount = 0
      if (productIds.length > 0) {
        const ordersWithProducts = await tx.order.findMany({
          where: { items: { some: { productId: { in: productIds } } } },
          select: { id: true },
        })
        const orderIdsWithProducts = ordersWithProducts.map((o) => o.id)
        if (orderIdsWithProducts.length > 0) {
          await tx.payment.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.stockMovement.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.whatsAppMessage.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.orderItem.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          await tx.couponRedemption.deleteMany({ where: { orderId: { in: orderIdsWithProducts } } })
          const deletedStoreOrdersRes = await tx.order.deleteMany({ where: { id: { in: orderIdsWithProducts } } })
          deletedOrdersCount += deletedStoreOrdersRes.count
        }

        await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } })
        await tx.productImage.deleteMany({ where: { productId: { in: productIds } } })
        await tx.flashSaleItem.deleteMany({ where: { productId: { in: productIds } } })
        await tx.stockMovement.deleteMany({ where: { productId: { in: productIds } } })
        await tx.review.deleteMany({ where: { productId: { in: productIds } } })
        await tx.notifyRequest.deleteMany({ where: { productId: { in: productIds } } })
        const productsRes = await tx.product.deleteMany({ where: { id: { in: productIds } } })
        deletedProductsCount = productsRes.count
      }

      return {
        products: deletedProductsCount,
        orders: deletedOrdersCount,
        users: deletedUsersCount,
        sessions: deletedSessionsCount,
      }
    })
  }
}
