<script setup lang="ts">
import { ChevronDown, SlidersHorizontal } from '@lucide/vue'
import type { CatalogSort } from '@serag/shared'

withDefaults(
  defineProps<{
    total: number
    sort?: CatalogSort
    hasQuery?: boolean
    activeFiltersCount?: number
  }>(),
  {
    sort: undefined,
    hasQuery: false,
    activeFiltersCount: 0,
  },
)

const emit = defineEmits<{
  'update:sort': [sort: CatalogSort]
  openFilters: []
}>()

const { t } = useI18n()
const sortSelectId = useId()

function onSortChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:sort', target.value as CatalogSort)
}
</script>

<template>
  <div
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/60 p-3 backdrop-blur-xs sm:p-4"
  >
    <!-- Result count with live region -->
    <div
      aria-live="polite"
      aria-atomic="true"
      class="text-sm font-semibold text-muted-foreground sm:text-base"
    >
      <i18n-t keypath="store.listing.productCount" tag="span">
        <template #count>
          <span class="num font-bold text-foreground">{{ total.toLocaleString() }}</span>
        </template>
      </i18n-t>
    </div>

    <!-- Right/End section: Mobile Filter Trigger + Sort dropdown -->
    <div class="flex items-center gap-2 sm:gap-4">
      <!-- Mobile filters trigger button (hidden on desktop lg) -->
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground shadow-xs transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm lg:hidden motion-reduce:transition-none"
        @click="emit('openFilters')"
      >
        <SlidersHorizontal class="size-4 text-serag-gold" aria-hidden="true" />
        <span>{{ t('store.listing.filters') }}</span>
        <span
          v-if="activeFiltersCount > 0"
          class="num flex size-5 items-center justify-center rounded-full bg-serag-night text-[11px] font-extrabold text-serag-gold-hi dark:bg-serag-gold dark:text-serag-night"
          :aria-label="t('store.listing.filterCountAria', { count: activeFiltersCount })"
        >
          {{ activeFiltersCount }}
        </span>
      </button>

      <!-- Sort dropdown with accessible label -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <label
          :for="sortSelectId"
          class="text-xs font-bold text-muted-foreground sm:text-sm whitespace-nowrap"
        >
          {{ t('store.listing.sortBy') }}:
        </label>
        <div class="relative">
          <select
            :id="sortSelectId"
            :value="sort ?? (hasQuery ? 'relevance' : 'popular')"
            class="min-h-11 cursor-pointer appearance-none rounded-xl border border-border bg-card py-2 ps-3 pe-8 text-xs font-bold text-foreground shadow-xs transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm motion-reduce:transition-none"
            @change="onSortChange"
          >
            <option v-if="hasQuery" value="relevance">
              {{ t('store.listing.sortOptions.relevance') }}
            </option>
            <option value="popular">
              {{ t('store.listing.sortOptions.popular') }}
            </option>
            <option value="price_asc">
              {{ t('store.listing.sortOptions.price_asc') }}
            </option>
            <option value="price_desc">
              {{ t('store.listing.sortOptions.price_desc') }}
            </option>
            <option value="discount">
              {{ t('store.listing.sortOptions.discount') }}
            </option>
            <option value="newest">
              {{ t('store.listing.sortOptions.newest') }}
            </option>
          </select>
          <ChevronDown
            class="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
