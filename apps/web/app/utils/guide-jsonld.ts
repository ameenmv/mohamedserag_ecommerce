import type { PublicGuide } from '@serag/shared'

/**
 * Builds Schema.org `Article` structured data for a guide.
 * Uses the request URL as the canonical `mainEntityOfPage`, the guide cover as
 * the (absolutized) image, and the store as both author and publisher.
 */
export function buildGuideJsonLd(
  guide: PublicGuide,
  requestUrl: string,
  storeName: string,
): Record<string, unknown> {
  const origin = parseOrigin(requestUrl)
  return buildGuideJsonLdWithOrigin(guide, origin, storeName)
}

function parseOrigin(requestUrl: string): string {
  try {
    return new URL(requestUrl).origin
  } catch {
    return ''
  }
}

/**
 * Absolute URL for a possibly-relative image path, resolved against the origin.
 */
export function absoluteImageUrl(cover: string | null, origin: string): string | undefined {
  if (!cover) return undefined
  if (/^https?:\/\//i.test(cover)) return cover
  if (!origin) return cover
  return `${origin}${cover.startsWith('/') ? '' : '/'}${cover}`
}

export function buildGuideJsonLdWithOrigin(
  guide: PublicGuide,
  origin: string,
  storeName: string,
): Record<string, unknown> {
  const pageUrl = `${origin}/guides/${guide.slug}`
  const organization = {
    '@type': 'Organization',
    name: storeName,
    url: origin || undefined,
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    author: organization,
    publisher: organization,
  }

  const image = absoluteImageUrl(guide.cover, origin)
  if (image) {
    jsonLd.image = image
  }

  const description = guide.seoDescription || guide.summary
  if (description) {
    jsonLd.description = description
  }

  if (guide.publishedAt) {
    jsonLd.datePublished = guide.publishedAt
  }

  if (guide.updatedAt) {
    jsonLd.dateModified = guide.updatedAt
  }

  return jsonLd
}
