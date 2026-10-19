import { describe, expect, it } from 'vitest'
import {
  absoluteUrl,
  canonicalPath,
  buildBreadcrumbList,
  hasPlaceholder,
  buildLocalBusiness,
  type StoreInfo,
  type BreadcrumbItem,
} from './seo.js'

describe('seo', () => {
  it('canonical keeps ?page=2, drops page=1, page=abc, sort/brand/q, trims trailing slash', () => {
    expect(canonicalPath('/shop/', { page: '2' })).toBe('/shop?page=2')
    expect(canonicalPath('/shop', { page: '1' })).toBe('/shop')
    expect(canonicalPath('/shop', { page: 'abc' })).toBe('/shop')
    expect(canonicalPath('/shop', { page: '2abc' })).toBe('/shop')
    expect(canonicalPath('/shop', { page: ['2', '3'] })).toBe('/shop')
    expect(canonicalPath('/shop/', { sort: 'price', brand: 'lg', q: 'fridge', page: '3' })).toBe('/shop?page=3')
    expect(canonicalPath('/', {})).toBe('/')
  })

  it('breadcrumb positions and absolute URLs', () => {
    const items: BreadcrumbItem[] = [
      { name: 'الرئيسية', path: '/' },
      { name: 'ثلاجات', path: '/categories/refrigerators' },
      { name: 'ثلاجة lg', path: '/products/lg-fridge' },
    ]
    expect(buildBreadcrumbList(items, 'https://serag.eg')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://serag.eg/' },
        { '@type': 'ListItem', position: 2, name: 'ثلاجات', item: 'https://serag.eg/categories/refrigerators' },
        { '@type': 'ListItem', position: 3, name: 'ثلاجة lg', item: 'https://serag.eg/products/lg-fridge' },
      ],
    })
  })

  it('local business null with [رقم الهاتف], object with real values', () => {
    const bad: StoreInfo = { name: 'سراج', phone: '[رقم الهاتف]', address: 'address', hours: '9-5' }
    expect(buildLocalBusiness(bad, 'https://serag.eg')).toBe(null)

    const good: StoreInfo = { name: 'سراج', phone: '01000000000', address: 'شارع الجمهورية', hours: 'السبت - الخميس: 9:00 - 21:00' }
    expect(buildLocalBusiness(good, 'https://serag.eg', '/uploads/logo.png')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'HomeGoodsStore',
      name: 'سراج',
      telephone: '01000000000',
      address: { '@type': 'PostalAddress', streetAddress: 'شارع الجمهورية', addressLocality: 'المنصورة', addressCountry: 'EG' },
      openingHours: 'السبت - الخميس: 9:00 - 21:00',
      url: 'https://serag.eg/',
      image: 'https://serag.eg/uploads/logo.png',
    })
  })

  it('absoluteUrl joins', () => {
    expect(absoluteUrl('https://a.eg/', '/p/x')).toBe('https://a.eg/p/x')
    expect(absoluteUrl('https://a.eg', 'p/x')).toBe('https://a.eg/p/x')
    expect(absoluteUrl('https://a.eg', '/')).toBe('https://a.eg/')
  })

  it('hasPlaceholder flags empty values and bracketed placeholders', () => {
    expect(hasPlaceholder('')).toBe(true)
    expect(hasPlaceholder('   ')).toBe(true)
    expect(hasPlaceholder(null)).toBe(true)
    expect(hasPlaceholder('[عنوان المعرض]')).toBe(true)
    expect(hasPlaceholder('شارع الجمهورية')).toBe(false)
  })
})
