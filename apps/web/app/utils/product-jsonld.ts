import type { ProductDetail } from '@serag/shared'
import { piastresToEgp } from '@serag/shared'

export function mapAvailabilityToSchemaUrl(state: string): string {
  switch (state) {
    case 'in_stock':
      return 'https://schema.org/InStock'
    case 'low':
      return 'https://schema.org/LimitedAvailability'
    case 'on_request':
      return 'https://schema.org/PreOrder'
    case 'out':
    default:
      return 'https://schema.org/OutOfStock'
  }
}

/**
 * Builds standard Schema.org Product JSON-LD structured data.
 * Adheres to Google Merchant and rich result specifications:
 * - Product: name, sku, brand, images, offers
 * - Offer: price in EGP, priceCurrency EGP, availability mapped from availability state
 */
export function buildProductJsonLd(
  product: ProductDetail,
  url?: string,
): Record<string, unknown> {
  const images: string[] = []
  if (product.images && product.images.length > 0) {
    for (const img of product.images) {
      if (img.url && !images.includes(img.url)) {
        images.push(img.url)
      }
    }
  } else if (product.image?.url) {
    images.push(product.image.url)
  }

  const priceEgp = piastresToEgp(product.price)

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    price: priceEgp,
    priceCurrency: 'EGP',
    availability: mapAvailabilityToSchemaUrl(product.availability.state),
    itemCondition: 'https://schema.org/NewCondition',
  }

  if (url) {
    offers.url = url
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.modelCode,
    brand: {
      '@type': 'Brand',
      name: product.brand.name,
    },
    offers,
  }

  if (images.length === 1 && images[0]) {
    jsonLd.image = images[0]
  } else if (images.length > 1) {
    jsonLd.image = images
  }

  if (url) {
    jsonLd.url = url
  }

  return jsonLd
}
