<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import type {
  CatalogAvailabilityFilter,
  CatalogFacets,
  SpecTemplateField,
} from '@serag/shared'
import { CATALOG_AVAILABILITY_FILTERS } from '@serag/shared'
import {
  setSpecRange,
  toggleSpecBoolean,
  toggleSpecChoice,
  type ListingFilters,
} from '~/utils/catalog-query'

const props = withDefaults(
  defineProps<{
    filters: ListingFilters
    facets?: CatalogFacets
    fields?: readonly SpecTemplateField[] | SpecTemplateField[]
    hideBrand?: boolean
  }>(),
  {
    facets: undefined,
    fields: () => [],
    hideBrand: false,
  },
)

const emit = defineEmits<{
  change: [patch: Partial<ListingFilters>]
  clear: []
}>()

const { t } = useI18n()

// Filterable spec fields (skipping text fields without options per PRD)
const filterableFields = computed(() => {
  return (props.fields || []).filter((f) => {
    if (!f.filterable) return false
    if (f.type === 'text' && (!f.options || f.options.length === 0)) {
      return false
    }
    return true
  })
})

const brandOptions = computed(() => {
  return (props.facets?.brands ?? []).map((b) => ({
    value: b.slug,
    label: b.name,
    count: b.count,
  }))
})

const availabilityOptions = computed(() => {
  return CATALOG_AVAILABILITY_FILTERS.map((avail) => ({
    value: avail,
    label:
      avail === 'in_stock'
        ? t('store.availability.inStock')
        : avail === 'low'
          ? t('store.availability.low')
          : avail === 'on_request'
            ? t('store.availability.onRequest')
            : t('store.availability.outOfStock'),
  }))
})

function onBrandToggle(slug: string) {
  const next = props.filters.brands.includes(slug)
    ? props.filters.brands.filter((b) => b !== slug)
    : [...props.filters.brands, slug]
  emit('change', { brands: next })
}

function onPriceChange(range: { min?: number; max?: number }) {
  emit('change', { minPrice: range.min, maxPrice: range.max })
}

function onAvailabilityToggle(val: string) {
  const current = props.filters.availability
  const typed = val as CatalogAvailabilityFilter
  const next = current.includes(typed)
    ? current.filter((a) => a !== typed)
    : [...current, typed]
  emit('change', { availability: next })
}

function onDiscountedToggle() {
  emit('change', { discounted: !props.filters.discounted })
}

function onSpecChoiceToggle(key: string, option: string) {
  emit('change', { specs: toggleSpecChoice(props.filters.specs, key, option) })
}

function onSpecBooleanToggle(key: string) {
  emit('change', { specs: toggleSpecBoolean(props.filters.specs, key) })
}

function onSpecRangeChange(key: string, range: { min?: number; max?: number }) {
  emit('change', { specs: setSpecRange(props.filters.specs, key, range.min, range.max) })
}

function getSpecChoiceValues(key: string): string[] {
  const spec = props.filters.specs[key]
  return spec && (spec.type === 'choice' || spec.type === 'text') ? spec.values : []
}

function isSpecBooleanActive(key: string): boolean {
  const spec = props.filters.specs[key]
  return spec?.type === 'boolean' && spec.value === true
}

function getSpecRange(key: string): { min?: number; max?: number } {
  const spec = props.filters.specs[key]
  return spec?.type === 'number' ? { min: spec.min, max: spec.max } : {}
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Header: Title + Clear All -->
    <div class="flex items-center justify-between border-b border-border/80 pb-3">
      <h2 class="text-base font-bold text-foreground">
        {{ t('store.listing.filtersTitle') }}
      </h2>
      <button
        type="button"
        class="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        @click="emit('clear')"
      >
        <RotateCcw class="size-3" aria-hidden="true" />
        <span>{{ t('store.listing.clearAll') }}</span>
      </button>
    </div>

    <!-- Brands Section -->
    <StoreListingFilterSection
      v-if="!hideBrand && brandOptions.length > 0"
      :title="t('store.listing.brands')"
    >
      <StoreListingFilterChecklist
        :title="t('store.listing.brands')"
        :options="brandOptions"
        :selected="filters.brands"
        @toggle="onBrandToggle"
      />
    </StoreListingFilterSection>

    <!-- Price Range Section -->
    <StoreListingFilterSection :title="t('store.listing.price')">
      <StoreListingFilterRange
        :min="filters.minPrice"
        :max="filters.maxPrice"
        :min-placeholder="facets?.price?.min !== null && facets?.price?.min !== undefined ? String(facets.price.min) : '0'"
        :max-placeholder="facets?.price?.max !== null && facets?.price?.max !== undefined ? String(facets.price.max) : ''"
        :unit="t('store.listing.egpUnit')"
        @change="onPriceChange"
      />
    </StoreListingFilterSection>

    <!-- Availability & Offers Section -->
    <StoreListingFilterSection :title="t('store.listing.availability')">
      <fieldset class="flex flex-col gap-0.5">
        <legend class="sr-only">{{ t('store.listing.availability') }}</legend>
        <label
          class="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-secondary/60"
        >
          <input
            type="checkbox"
            :checked="filters.discounted"
            class="size-4.5 cursor-pointer rounded-sm border-input accent-serag-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:accent-serag-gold"
            @change="onDiscountedToggle"
          >
          <span class="font-medium text-foreground">{{ t('store.listing.discountedOnly') }}</span>
        </label>
      </fieldset>

      <StoreListingFilterChecklist
        :title="t('store.listing.availability')"
        :options="availabilityOptions"
        :selected="filters.availability"
        @toggle="onAvailabilityToggle"
      />
    </StoreListingFilterSection>

    <!-- Dynamic Category Spec Fields -->
    <template v-for="field in filterableFields" :key="field.key">
      <!-- Choice / text options -->
      <StoreListingFilterSection
        v-if="(field.type === 'choice' || field.type === 'text') && field.options && field.options.length > 0"
        :title="field.label"
      >
        <StoreListingFilterChecklist
          :title="field.label"
          :options="field.options.map((opt) => ({ value: opt, label: opt }))"
          :selected="getSpecChoiceValues(field.key)"
          @toggle="onSpecChoiceToggle(field.key, $event)"
        />
      </StoreListingFilterSection>

      <!-- Boolean field -->
      <StoreListingFilterSection
        v-else-if="field.type === 'boolean'"
        :title="field.label"
      >
        <fieldset class="flex flex-col gap-0.5">
          <legend class="sr-only">{{ field.label }}</legend>
          <label
            class="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-secondary/60"
          >
            <input
              type="checkbox"
              :checked="isSpecBooleanActive(field.key)"
              class="size-4.5 cursor-pointer rounded-sm border-input accent-serag-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:accent-serag-gold"
              @change="onSpecBooleanToggle(field.key)"
            >
            <span class="font-medium text-foreground">{{ field.label }}</span>
          </label>
        </fieldset>
      </StoreListingFilterSection>

      <!-- Number range field -->
      <StoreListingFilterSection
        v-else-if="field.type === 'number'"
        :title="field.unit ? `${field.label} (${field.unit})` : field.label"
      >
        <StoreListingFilterRange
          :min="getSpecRange(field.key).min"
          :max="getSpecRange(field.key).max"
          :unit="field.unit ?? undefined"
          @change="onSpecRangeChange(field.key, $event)"
        />
      </StoreListingFilterSection>
    </template>
  </div>
</template>
