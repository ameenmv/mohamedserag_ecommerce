export interface SitemapEntry {
  path: string
  lastmod: string
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (!siteUrl) return path
  const cleanBase = siteUrl.replace(/\/$/, '')
  if (!path || path === '/') return cleanBase + '/'
  const cleanPath = path.startsWith('/') ? path : '/' + path
  return cleanBase + cleanPath
}

export function canonicalPath(path: string, query: Record<string, string | string[] | null | undefined>): string {
  let result = path
  // Remove trailing slash except root
  if (result.length > 1 && result.endsWith('/')) {
    result = result.slice(0, -1)
  }

  const pageVal = query.page
  let pageParam: string | null = null
  if (typeof pageVal === 'string' && /^\d+$/.test(pageVal)) {
    const num = Number(pageVal)
    if (num >= 2) pageParam = String(num)
  }

  if (pageParam) {
    result += '?page=' + pageParam
  }

  return result
}

export interface BreadcrumbItem {
  name: string
  path: string
}

export function buildBreadcrumbList(items: BreadcrumbItem[], siteUrl: string): Record<string, unknown> {
  const itemListElement = items.map((item, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: item.name,
    item: absoluteUrl(siteUrl, item.path),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

export interface StoreInfo {
  name: string
  phone: string
  address: string
  hours: string
}

/** `GET /settings/store`: public store details. Values may still hold `[…]` placeholders before launch. */
export interface PublicStoreInfo extends StoreInfo {
  whatsapp: string
  tradersWhatsapp: string
}

export function hasPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true
  const trimmed = value.trim()
  if (trimmed.length === 0) return true
  if (trimmed.includes('[')) return true
  return false
}

export function buildLocalBusiness(store: StoreInfo, siteUrl: string, logoPath?: string): Record<string, unknown> | null {
  if (hasPlaceholder(store.name) || hasPlaceholder(store.phone) || hasPlaceholder(store.address) || hasPlaceholder(store.hours)) {
    return null
  }

  const result: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeGoodsStore',
    name: store.name,
    telephone: store.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.address,
      addressLocality: 'المنصورة',
      addressCountry: 'EG',
    },
    openingHours: store.hours,
    url: absoluteUrl(siteUrl, '/'),
  }

  if (logoPath) {
    result.image = absoluteUrl(siteUrl, logoPath)
  }

  return result
}
