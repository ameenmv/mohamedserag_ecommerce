import { formatEgp } from './money.js'

export type ProductSeoLocale = 'ar' | 'en'

export interface ProductSlugInput {
  brandSlug: string
  categorySlug: string
  modelCode: string
}

export interface ProductSeoInput {
  name: string
  brandName: string
  modelCode: string
  price: number
  compareAtPrice: number | null
  warranty: string | null
  available: boolean
}

const SLUG_MAX_LENGTH = 80
// The storefront title template appends " · {store name}" (~17 chars), so the product part stays
// under 45 to keep the full title near Google's ~60-char display limit.
export const PRODUCT_SEO_TITLE_MAX = 45
const DESCRIPTION_MAX_LENGTH = 155

const DELIVERY_SENTENCE: Record<ProductSeoLocale, string> = {
  ar: 'توصيل لحد البيت والدفع عند الاستلام.',
  en: 'Home delivery with cash on delivery.',
}

const OUT_OF_STOCK_SENTENCE: Record<ProductSeoLocale, string> = {
  ar: 'غير متوفر حاليًا، سجّل طلب تنبيه عند توفره.',
  en: 'Currently unavailable—ask to be notified when it is back.',
}

const CURRENCY_UNIT: Record<ProductSeoLocale, string> = {
  ar: 'ج.م',
  en: 'EGP',
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/**
 * Converts model code to a lowercase, kebab-case URL-safe slug.
 * Does not transliterate Arabic.
 */
export function slugifyModelCode(modelCode: string): string {
  return toSlug(modelCode) || 'product'
}

function singularize(segment: string): string {
  if (segment.endsWith('ies')) return `${segment.slice(0, -3)}y`
  if (segment.endsWith('ss')) return segment
  if (segment.endsWith('s')) return segment.slice(0, -1)
  return segment
}

function capSlugAtDash(slug: string): string {
  if (slug.length <= SLUG_MAX_LENGTH) return slug
  const cut = slug.slice(0, SLUG_MAX_LENGTH)
  const lastDash = cut.lastIndexOf('-')
  const capped = lastDash > 0 ? cut.slice(0, lastDash) : cut
  return capped.replace(/-+$/, '')
}

/**
 * Builds `{brand}-{singular(category)}-{model}` in kebab-case.
 * Removes repeated segments (including a brand already present in the model code)
 * and caps the result at 80 characters on a dash boundary.
 */
export function buildProductSlug(input: ProductSlugInput): string {
  const brand = toSlug(input.brandSlug)
  const category = singularize(toSlug(input.categorySlug))
  let model = toSlug(input.modelCode)

  if (brand && model.startsWith(`${brand}-`)) {
    model = model.slice(brand.length + 1)
  }

  const seen = new Set<string>()
  const segments: string[] = []
  for (const segment of [brand, category, model]) {
    if (!segment || seen.has(segment)) continue
    seen.add(segment)
    segments.push(segment)
  }

  return capSlugAtDash(segments.join('-')) || 'product'
}

function limitWords(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const result = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
  return result.replace(/[\s|,;:.-]+$/, '')
}

function includesText(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase())
}

/**
 * Builds `{name} {brand} {modelCode}`, skipping brand/model already present in the
 * name, cut on a word boundary at PRODUCT_SEO_TITLE_MAX. The store name is added by
 * the storefront title template, not here.
 */
export function buildProductSeoTitle(
  input: ProductSeoInput,
  // Kept for symmetry with the description builder; the title has no localized words.
  _locale: ProductSeoLocale,
): string {
  const name = input.name.trim()
  const brand = input.brandName.trim()
  const modelCode = input.modelCode.trim()

  const parts = [name]
  if (brand && !includesText(name, brand)) parts.push(brand)
  if (modelCode && !includesText(name, modelCode)) parts.push(modelCode)

  const core = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return limitWords(core, PRODUCT_SEO_TITLE_MAX)
}

function ensureSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return /[.!?؟]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function buildWarrantySentence(input: ProductSeoInput): string {
  const warranty = input.warranty?.trim()
  if (!warranty) return ''

  const brand = input.brandName.trim()
  const base = warranty.replace(/[.!?؟]+$/, '').trim()
  const withBrand =
    brand && !base.toLowerCase().includes(brand.toLowerCase())
      ? `${base} ${brand}`
      : base

  return `${ensureSentence(withBrand)} `
}

function buildProductHeadline(input: ProductSeoInput): string {
  const name = input.name.trim()
  const brand = input.brandName.trim()
  return [name, brand].filter(Boolean).join(' ')
}

function buildPriceSentence(input: ProductSeoInput, locale: ProductSeoLocale): string {
  const headline = buildProductHeadline(input)
  const price = `${formatEgp(input.price)} ${CURRENCY_UNIT[locale]}`
  const compareAt =
    input.compareAtPrice !== null && input.compareAtPrice > input.price
      ? locale === 'ar'
        ? formatEgp(input.compareAtPrice)
        : `${formatEgp(input.compareAtPrice)} ${CURRENCY_UNIT[locale]}`
      : null

  if (!input.available) {
    return ensureSentence(`${headline}. ${OUT_OF_STOCK_SENTENCE[locale]}`)
  }

  if (compareAt) {
    return locale === 'ar'
      ? ensureSentence(`${headline} بـ ${price} بدل ${compareAt}`)
      : ensureSentence(`${headline} for ${price}, down from ${compareAt}`)
  }

  return locale === 'ar'
    ? ensureSentence(`${headline} بـ ${price}`)
    : ensureSentence(`${headline} for ${price}`)
}

function lastSentenceBoundary(slice: string): number {
  let last = -1
  for (const match of slice.matchAll(/[.!?؟](?=\s|$)/g)) {
    last = match.index ?? -1
  }
  return last
}

function capDescription(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= DESCRIPTION_MAX_LENGTH) return normalized

  const slice = normalized.slice(0, DESCRIPTION_MAX_LENGTH)
  const sentenceBoundary = lastSentenceBoundary(slice)
  if (sentenceBoundary > 0) {
    return slice.slice(0, sentenceBoundary + 1).trim()
  }

  return limitWords(normalized, DESCRIPTION_MAX_LENGTH)
}

/**
 * Builds the product meta description from price, discount, warranty and
 * availability, capped at 155 characters on a sentence then word boundary.
 */
export function buildProductSeoDescription(
  input: ProductSeoInput,
  locale: ProductSeoLocale,
): string {
  const priceSentence = buildPriceSentence(input, locale)
  const warrantySentence = buildWarrantySentence(input)
  const deliverySentence = DELIVERY_SENTENCE[locale]

  return capDescription(
    `${priceSentence} ${warrantySentence}${deliverySentence}`.replace(/\s+/g, ' ').trim(),
  )
}
