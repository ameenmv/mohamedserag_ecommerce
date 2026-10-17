import type { ProductCard, ProductDetail } from '@serag/shared'

/**
 * Pure mapper converting a full ProductDetail from GET /api/products/:slug
 * into a lightweight ProductCard suitable for cart, wishlist, and compare stores.
 */
export function toProductCard(detail: ProductDetail): ProductCard {
  const fallbackImage =
    detail.images.length > 0 && detail.images[0]
      ? {
          url: detail.images[0].url,
          alt: detail.images[0].alt,
          isReal: detail.images[0].isReal,
        }
      : null

  return {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    modelCode: detail.modelCode,
    brand: {
      slug: detail.brand.slug,
      name: detail.brand.name,
    },
    category: {
      slug: detail.category.slug,
      name: detail.category.name,
    },
    price: detail.price,
    oldPrice: detail.oldPrice,
    discountPercent: detail.discountPercent,
    image: detail.image ?? fallbackImage,
    availability: detail.availability,
  }
}
