import { Injectable } from '@nestjs/common'
import { absoluteUrl, deriveAvailability } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  buildGoogleFeed,
  formatFeedPrice,
  plainText,
  type GoogleFeedItem,
} from './feed-xml.js'

const BATCH_SIZE = 500

const CHANNEL_TITLE = 'معرض محمد سراج'
const CHANNEL_DESCRIPTION = 'أجهزة منزلية وتجهيز عرائس من معرض محمد سراج - المنصورة'

const feedProductSelect = {
  id: true,
  slug: true,
  modelCode: true,
  name: true,
  price: true,
  stock: true,
  lowStockThreshold: true,
  availabilityMode: true,
  seoDescription: true,
  brand: { select: { name: true } },
  images: {
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.ProductSelect

type FeedProduct = Prisma.ProductGetPayload<{ select: typeof feedProductSelect }>

interface ActiveFlash {
  salePrice: number
  startsAt: Date
  endsAt: Date
}

/** Base site origin for absolute feed URLs; trailing slash trimmed. */
export function siteUrl(): string {
  const raw = process.env.PUBLIC_SITE_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async buildGoogleXml(): Promise<string> {
    const now = new Date()
    const items: GoogleFeedItem[] = []
    let cursor: string | null = null

    for (;;) {
      const products: FeedProduct[] = await this.prisma.product.findMany({
        where: {
          visible: true,
          archivedAt: null,
          brand: { visible: true },
          category: { visible: true },
          images: { some: {} },
        },
        select: feedProductSelect,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      if (products.length === 0) {
        break
      }

      const flashes = await this.loadActiveFlashes(
        products.map((product) => product.id),
        now,
      )

      for (const product of products) {
        const item = this.toFeedItem(product, flashes.get(product.id) ?? null)
        if (item) {
          items.push(item)
        }
      }

      if (products.length < BATCH_SIZE) {
        break
      }

      const last: FeedProduct | undefined = products[products.length - 1]
      if (!last) {
        break
      }
      cursor = last.id
    }

    return buildGoogleFeed(
      { title: CHANNEL_TITLE, link: absoluteUrl(siteUrl(), '/'), description: CHANNEL_DESCRIPTION },
      items,
    )
  }

  private toFeedItem(product: FeedProduct, flash: ActiveFlash | null): GoogleFeedItem | null {
    const availability = deriveAvailability({
      mode: product.availabilityMode,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    })

    if (availability.state !== 'in_stock' && availability.state !== 'low') {
      return null
    }

    const image = product.images[0]
    if (!image) {
      return null
    }

    const descriptionSource =
      product.seoDescription && product.seoDescription.trim().length > 0
        ? product.seoDescription
        : product.name
    const description = plainText(descriptionSource, 5000) || product.name

    const item: GoogleFeedItem = {
      id: product.modelCode,
      title: product.name,
      description,
      link: absoluteUrl(siteUrl(), `/p/${product.slug}`),
      imageLink: /^https?:\/\//i.test(image.url) ? image.url : absoluteUrl(siteUrl(), image.url),
      price: formatFeedPrice(product.price),
      availability: 'in_stock',
      brand: product.brand.name,
      condition: 'new',
    }

    if (flash) {
      item.salePrice = formatFeedPrice(flash.salePrice)
      item.salePriceEffectiveDate = `${flash.startsAt.toISOString()}/${flash.endsAt.toISOString()}`
    }

    return item
  }

  /** One query per batch for the currently-running flash sale of each product; lowest sale price wins. */
  private async loadActiveFlashes(
    productIds: readonly string[],
    now: Date,
  ): Promise<Map<string, ActiveFlash>> {
    if (productIds.length === 0) {
      return new Map()
    }

    const rows = await this.prisma.flashSaleItem.findMany({
      where: {
        productId: { in: [...productIds] },
        flashSale: { startsAt: { lte: now }, endsAt: { gt: now } },
      },
      select: {
        productId: true,
        salePrice: true,
        flashSale: { select: { startsAt: true, endsAt: true } },
      },
    })

    const map = new Map<string, ActiveFlash>()
    for (const row of rows) {
      const existing = map.get(row.productId)
      if (!existing || row.salePrice < existing.salePrice) {
        map.set(row.productId, {
          salePrice: row.salePrice,
          startsAt: row.flashSale.startsAt,
          endsAt: row.flashSale.endsAt,
        })
      }
    }

    return map
  }
}
