import type { CatalogAvailabilityFilter, CatalogFacetBrand, SpecTemplateField } from '@serag/shared'
import { egpToPiastres, formatEgp } from '@serag/shared'
import type { ListingFilters } from './catalog-query'
import { withSpec } from './catalog-query'

const AVAILABILITY_LABEL_KEYS: Record<CatalogAvailabilityFilter, string> = {
  in_stock: 'store.availability.inStock',
  low: 'store.availability.low',
  on_request: 'store.availability.onRequest',
  out: 'store.availability.outOfStock',
}

export interface RawActiveFilterChip {
  id: string
  label: string
  patch: Partial<ListingFilters>
}

export interface BuildActiveChipsContext {
  brands?: readonly CatalogFacetBrand[] | CatalogFacetBrand[]
  fields?: readonly SpecTemplateField[] | SpecTemplateField[]
  t: (key: string, params?: Record<string, unknown>) => string
  formatNumber?: (amount: number) => string
}

/**
 * Formats EGP number with en-US thousands groupings without bare toLocaleString()
 * to prevent SSR hydration mismatches across environments.
 */
export function defaultFormatNumber(egp: number): string {
  return formatEgp(egpToPiastres(egp))
}

/**
 * Pure function that generates active filter chips with their corresponding removal patches.
 */
export function buildActiveChips(
  filters: ListingFilters,
  ctx: BuildActiveChipsContext,
): RawActiveFilterChip[] {
  const chips: RawActiveFilterChip[] = []
  const { brands = [], fields = [], t } = ctx
  const fmt = ctx.formatNumber ?? defaultFormatNumber

  // 1. Search query q
  if (filters.q && filters.q.trim().length > 0) {
    chips.push({
      id: 'q',
      label: `"${filters.q}"`,
      patch: { q: undefined },
    })
  }

  // 2. Brands
  if (filters.brands && filters.brands.length > 0) {
    for (const slug of filters.brands) {
      const facet = brands.find((b) => b.slug === slug)
      const name = facet?.name ?? slug
      chips.push({
        id: `brand:${slug}`,
        label: name,
        patch: {
          brands: filters.brands.filter((b) => b !== slug),
        },
      })
    }
  }

  // 3. Price
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    let priceLabel = ''
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      priceLabel = `${fmt(filters.minPrice)} - ${fmt(filters.maxPrice)} ${t('store.listing.egpUnit')}`
    } else if (filters.minPrice !== undefined) {
      priceLabel = `${t('store.listing.fromPrice')} ${fmt(filters.minPrice)} ${t('store.listing.egpUnit')}`
    } else if (filters.maxPrice !== undefined) {
      priceLabel = `${t('store.listing.upToPrice')} ${fmt(filters.maxPrice)} ${t('store.listing.egpUnit')}`
    }

    chips.push({
      id: 'price',
      label: priceLabel,
      patch: {
        minPrice: undefined,
        maxPrice: undefined,
      },
    })
  }

  // 4. Availability
  if (filters.availability && filters.availability.length > 0) {
    for (const avail of filters.availability) {
      const label = t(AVAILABILITY_LABEL_KEYS[avail])

      chips.push({
        id: `availability:${avail}`,
        label,
        patch: {
          availability: filters.availability.filter((a) => a !== avail),
        },
      })
    }
  }

  // 5. Discounted only
  if (filters.discounted) {
    chips.push({
      id: 'discounted',
      label: t('store.listing.discountedOnly'),
      patch: { discounted: false },
    })
  }

  // 6. Specs
  if (filters.specs) {
    for (const [key, spec] of Object.entries(filters.specs)) {
      const fieldDef = fields.find((f) => f.key === key)
      const fieldLabel = fieldDef?.label ?? key

      if (spec.type === 'choice' || spec.type === 'text') {
        for (const val of spec.values) {
          const remaining = spec.values.filter((v) => v !== val)
          const nextSpecVal =
            remaining.length > 0
              ? { type: spec.type, values: remaining }
              : undefined
          chips.push({
            id: `spec:${key}:${val}`,
            label: `${fieldLabel}: ${val}`,
            patch: {
              specs: withSpec(filters.specs, key, nextSpecVal),
            },
          })
        }
      } else if (spec.type === 'boolean') {
        chips.push({
          id: `spec:${key}`,
          label: fieldLabel,
          patch: {
            specs: withSpec(filters.specs, key, undefined),
          },
        })
      } else if (spec.type === 'number') {
        const unit = fieldDef?.unit ? ` ${fieldDef.unit}` : ''
        let numLabel = fieldLabel
        if (spec.min !== undefined && spec.max !== undefined) {
          numLabel = `${fieldLabel}: ${fmt(spec.min)} - ${fmt(spec.max)}${unit}`
        } else if (spec.min !== undefined) {
          numLabel = `${fieldLabel}: ${t('store.listing.fromPrice')} ${fmt(spec.min)}${unit}`
        } else if (spec.max !== undefined) {
          numLabel = `${fieldLabel}: ${t('store.listing.upToPrice')} ${fmt(spec.max)}${unit}`
        }

        chips.push({
          id: `spec:${key}`,
          label: numLabel,
          patch: {
            specs: withSpec(filters.specs, key, undefined),
          },
        })
      }
    }
  }

  return chips
}
