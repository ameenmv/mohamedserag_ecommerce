import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'
import type { CreateProductOutput } from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { SearchIndexService } from '../catalog/search-index.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { WhatsAppAlertsService } from '../whatsapp/whatsapp-alerts.service.js'
import { AdminProductsService } from './admin-products.service.js'

const NEW_PRODUCT_ID = 'new-product-id'

function makeProductRecord(slug: string) {
  return {
    id: NEW_PRODUCT_ID,
    slug,
    modelCode: 'SR-S15',
    name: 'بوتاجاز غاز 4 شعلة',
    brandId: 'brand-1',
    categoryId: 'category-1',
    specs: {},
    price: 940000,
    oldPrice: null,
    stock: 5,
    lowStockThreshold: 3,
    availabilityMode: 'auto',
    leadTimeText: null,
    warranty: null,
    warrantyActivation: null,
    origin: null,
    setContents: null,
    visible: true,
    featured: false,
    archivedAt: null,
    taxRate: 14,
    etaItemCode: null,
    seoTitle: null,
    seoDescription: null,
    translations: {},
    images: [],
    brand: { id: 'brand-1', name: 'فريش', slug: 'fresh' },
    category: { id: 'category-1', name: 'بوتاجازات', slug: 'cookers' },
    createdAt: new Date('2026-11-06T00:00:00.000Z'),
    updatedAt: new Date('2026-11-06T00:00:00.000Z'),
  }
}

function makePrisma(slugExists: (slug: string) => boolean) {
  const product = {
    findUnique: vi.fn().mockImplementation((args: { where: Record<string, string> }) => {
      if ('modelCode' in args.where) return Promise.resolve(null)
      if ('slug' in args.where) {
        const slug = args.where.slug ?? ''
        return Promise.resolve(slugExists(slug) ? { id: 'existing-product' } : null)
      }
      if (args.where.id === NEW_PRODUCT_ID) {
        return Promise.resolve(makeProductRecord('fresh-cooker-sr-s15'))
      }
      return Promise.resolve(null)
    }),
    create: vi.fn().mockResolvedValue({ id: NEW_PRODUCT_ID }),
  }

  return {
    category: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'category-1',
        slug: 'cookers',
        specTemplate: null,
      }),
    },
    brand: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'brand-1',
        slug: 'fresh',
        name: 'فريش',
      }),
    },
    product,
    orderItem: {
      count: vi.fn().mockResolvedValue(0),
    },
  }
}

async function createService(prisma: ReturnType<typeof makePrisma>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AdminProductsService,
      { provide: PrismaService, useValue: prisma },
      {
        provide: SearchIndexService,
        useValue: { reindexProduct: vi.fn().mockResolvedValue(undefined) },
      },
      {
        provide: StoreSettingsService,
        useValue: { getLowStock: vi.fn().mockResolvedValue({ defaultThreshold: 3 }) },
      },
      { provide: WhatsAppAlertsService, useValue: {} },
    ],
  }).compile()

  return moduleRef.get(AdminProductsService)
}

const productInput: CreateProductOutput = {
  name: 'بوتاجاز غاز 4 شعلة',
  modelCode: 'SR-S15',
  brandId: 'brand-1',
  categoryId: 'category-1',
  specs: {},
  price: 940000,
  stock: 5,
  lowStockThreshold: 3,
  availabilityMode: 'auto',
  visible: true,
  featured: false,
  taxRate: 14,
}

describe('AdminProductsService.create auto slug', () => {
  it('builds brand-category-model slug when none is provided', async () => {
    const prisma = makePrisma(() => false)
    const service = await createService(prisma)

    await service.create(productInput)

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'fresh-cooker-sr-s15' }),
      }),
    )
  })

  it('appends a nanoid suffix when the generated slug already exists', async () => {
    const prisma = makePrisma((slug) => slug === 'fresh-cooker-sr-s15')
    const service = await createService(prisma)

    await service.create(productInput)

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^fresh-cooker-sr-s15-.{4}$/),
        }),
      }),
    )
  })
})
