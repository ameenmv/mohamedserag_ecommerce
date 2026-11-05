import { describe, expect, it, vi } from 'vitest'
import { Test } from '@nestjs/testing'
import { CatalogService } from './catalog.service.js'
import { PrismaService } from '../prisma/prisma.service.js'

describe('CatalogService - getCategoriesTree', () => {
  it('asserts a category with two products returns the min price and a cover image, and a category with no images returns coverImage null', async () => {
    const mockCategories = [
      {
        id: 'cat-two-prods',
        name: 'أجهزة المطبخ',
        slug: 'kitchen',
        parentId: null,
        intro: null,
        accent: 'green',
        illustration: 'fridge',
        seoTitle: null,
        seoDescription: null,
        sort: 1,
        translations: {},
      },
      {
        id: 'cat-no-imgs',
        name: 'أدوات بدون صور',
        slug: 'no-images',
        parentId: null,
        intro: null,
        accent: 'sand',
        illustration: 'cookware',
        seoTitle: null,
        seoDescription: null,
        sort: 2,
        translations: {},
      },
    ]

    const mockProductCounts = [
      { categoryId: 'cat-two-prods', _count: { _all: 2 } },
      { categoryId: 'cat-no-imgs', _count: { _all: 1 } },
    ]

    const mockProducts = [
      {
        categoryId: 'cat-two-prods',
        price: 300000,
        featured: true,
        images: [{ url: '/uploads/featured-product.webp' }],
      },
      {
        categoryId: 'cat-two-prods',
        price: 150000,
        featured: false,
        images: [{ url: '/uploads/cheaper-product.webp' }],
      },
      {
        categoryId: 'cat-no-imgs',
        price: 250000,
        featured: false,
        images: [],
      },
    ]

    const mockPrisma = {
      category: {
        findMany: vi.fn().mockResolvedValue(mockCategories),
      },
      product: {
        groupBy: vi.fn().mockResolvedValue(mockProductCounts),
        findMany: vi.fn().mockResolvedValue(mockProducts),
      },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile()

    const service = moduleRef.get(CatalogService)
    const tree = await service.getCategoriesTree()

    expect(tree).toHaveLength(2)

    // Category with two products: min price is 150,000 piastres, cover image is the featured product's image
    const twoProdsNode = tree.find((c) => c.slug === 'kitchen')
    expect(twoProdsNode).toBeDefined()
    expect(twoProdsNode?.startingPrice).toBe(150000)
    expect(twoProdsNode?.coverImage).toBe('/uploads/featured-product.webp')
    expect(twoProdsNode?.coverImages).toEqual([
      '/uploads/featured-product.webp',
      '/uploads/cheaper-product.webp',
    ])

    // Category with no images: startingPrice is 250,000 piastres, coverImage is null
    const noImgsNode = tree.find((c) => c.slug === 'no-images')
    expect(noImgsNode).toBeDefined()
    expect(noImgsNode?.startingPrice).toBe(250000)
    expect(noImgsNode?.coverImage).toBeNull()
    expect(noImgsNode?.coverImages).toEqual([])
  })

  it('aggregates startingPrice and coverImage from descendants', async () => {
    const mockCategories = [
      {
        id: 'cat-parent',
        name: 'قسم رئيسي',
        slug: 'parent',
        parentId: null,
        intro: null,
        accent: 'green',
        illustration: 'default',
        seoTitle: null,
        seoDescription: null,
        sort: 1,
        translations: {},
      },
      {
        id: 'cat-child',
        name: 'قسم فرعي',
        slug: 'child',
        parentId: 'cat-parent',
        intro: null,
        accent: 'green',
        illustration: 'washer',
        seoTitle: null,
        seoDescription: null,
        sort: 1,
        translations: {},
      },
    ]

    const mockProductCounts = [
      { categoryId: 'cat-child', _count: { _all: 1 } },
    ]

    const mockProducts = [
      {
        categoryId: 'cat-child',
        price: 180000,
        featured: false,
        images: [{ url: '/uploads/child-cover.webp' }],
      },
    ]

    const mockPrisma = {
      category: {
        findMany: vi.fn().mockResolvedValue(mockCategories),
      },
      product: {
        groupBy: vi.fn().mockResolvedValue(mockProductCounts),
        findMany: vi.fn().mockResolvedValue(mockProducts),
      },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile()

    const service = moduleRef.get(CatalogService)
    const tree = await service.getCategoriesTree()

    expect(tree).toHaveLength(1)
    const parentNode = tree[0]
    expect(parentNode?.slug).toBe('parent')
    expect(parentNode?.startingPrice).toBe(180000)
    expect(parentNode?.coverImage).toBe('/uploads/child-cover.webp')
    expect(parentNode?.coverImages).toEqual(['/uploads/child-cover.webp'])
    expect(parentNode?.children[0]?.startingPrice).toBe(180000)
    expect(parentNode?.children[0]?.coverImage).toBe('/uploads/child-cover.webp')
    expect(parentNode?.children[0]?.coverImages).toEqual(['/uploads/child-cover.webp'])
  })

  it('picks up to 3 images from different products (featured first, higher price), merges from children, and deduplicates urls', async () => {
    const mockCategories = [
      {
        id: 'cat-parent',
        name: 'أجهزة التبريد',
        slug: 'cooling',
        parentId: null,
        intro: null,
        accent: 'deep-teal',
        illustration: 'fridge',
        seoTitle: null,
        seoDescription: null,
        sort: 1,
        translations: {},
      },
      {
        id: 'cat-child',
        name: 'ثلاجات',
        slug: 'fridges',
        parentId: 'cat-parent',
        intro: null,
        accent: 'deep-teal',
        illustration: 'fridge',
        seoTitle: null,
        seoDescription: null,
        sort: 1,
        translations: {},
      },
    ]

    const mockProductCounts = [
      { categoryId: 'cat-parent', _count: { _all: 3 } },
      { categoryId: 'cat-child', _count: { _all: 2 } },
    ]

    const mockProducts = [
      // Parent product 1: standard, 500k
      {
        categoryId: 'cat-parent',
        price: 500000,
        featured: false,
        images: [{ url: '/uploads/parent-standard-500k.webp' }],
      },
      // Parent product 2: featured, 200k
      {
        categoryId: 'cat-parent',
        price: 200000,
        featured: true,
        images: [{ url: '/uploads/parent-featured-200k.webp' }],
      },
      // Parent product 3: duplicate url with product 2, featured, 100k
      {
        categoryId: 'cat-parent',
        price: 100000,
        featured: true,
        images: [{ url: '/uploads/parent-featured-200k.webp' }],
      },
      // Child product 1: duplicate of parent's url
      {
        categoryId: 'cat-child',
        price: 350000,
        featured: true,
        images: [{ url: '/uploads/parent-standard-500k.webp' }],
      },
      // Child product 2: unique url
      {
        categoryId: 'cat-child',
        price: 300000,
        featured: false,
        images: [{ url: '/uploads/child-unique-300k.webp' }],
      },
    ]

    const mockPrisma = {
      category: {
        findMany: vi.fn().mockResolvedValue(mockCategories),
      },
      product: {
        groupBy: vi.fn().mockResolvedValue(mockProductCounts),
        findMany: vi.fn().mockResolvedValue(mockProducts),
      },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile()

    const service = moduleRef.get(CatalogService)
    const tree = await service.getCategoriesTree()

    expect(tree).toHaveLength(1)
    const parentNode = tree[0]
    expect(parentNode).toBeDefined()

    // Parent direct candidates:
    // 1. featured 200k -> '/uploads/parent-featured-200k.webp'
    // 2. standard 500k -> '/uploads/parent-standard-500k.webp'
    // Duplicate url at 100k is skipped.
    // To reach 3, parent takes from child:
    // - '/uploads/parent-standard-500k.webp' is duplicate, skipped.
    // - '/uploads/child-unique-300k.webp' fills the 3rd slot.
    expect(parentNode?.coverImages).toEqual([
      '/uploads/parent-featured-200k.webp',
      '/uploads/parent-standard-500k.webp',
      '/uploads/child-unique-300k.webp',
    ])
    expect(parentNode?.coverImage).toBe('/uploads/parent-featured-200k.webp')
  })
})
