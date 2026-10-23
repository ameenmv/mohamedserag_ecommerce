<script setup lang="ts">
import type {
  CatalogSort,
  ProductListResponse,
  SpecTemplateField,
} from '@serag/shared'
import type { ActiveFilterChip } from '~/composables/useListing'
import type { ListingFilters } from '~/utils/catalog-query'

withDefaults(
  defineProps<{
    filters: ListingFilters
    data: ProductListResponse | undefined
    pending?: boolean
    fields?: readonly SpecTemplateField[] | SpecTemplateField[]
    hideBrand?: boolean
    base?: { category?: string; brand?: string }
    activeChips: readonly ActiveFilterChip[] | ActiveFilterChip[]
  }>(),
  {
    pending: false,
    fields: () => [],
    hideBrand: false,
    base: undefined,
  },
)

const emit = defineEmits<{
  setFilters: [patch: Partial<ListingFilters>]
  clearFilters: [keepSearch?: boolean]
  updateSort: [sort: CatalogSort]
}>()

// Lazy-load mobile filter sheet only after the user opens it for the first time
const filterSheetOpenedOnce = ref(false)
const filterSheetOpen = ref(false)

function openFilters() {
  filterSheetOpenedOnce.value = true
  filterSheetOpen.value = true
}

function handleSortChange(sort: CatalogSort) {
  emit('updateSort', sort)
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
    <!-- Page Header Slot: Breadcrumb, Heading, Intro, Category Pills, Brand Banner -->
    <header v-if="$slots.header" class="mb-6 sm:mb-8">
      <slot name="header" />
    </header>

    <!-- Main Layout: Sidebar on lg start side, Results on end side -->
    <div class="flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
      <!-- Desktop Filters Sidebar (Hidden below lg); stays in view and scrolls on its own -->
      <aside
        class="scrollbar-none hidden w-72 shrink-0 rounded-[28px] border border-border bg-card p-5 shadow-xs lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"
      >
        <StoreListingFilters
          :filters="filters"
          :facets="data?.facets"
          :fields="fields"
          :hide-brand="hideBrand"
          @change="emit('setFilters', $event)"
          @clear="emit('clearFilters')"
        />
      </aside>

      <!-- Results Column -->
      <div id="listing-results-top" class="min-w-0 flex-1 w-full">
        <!-- Toolbar: count, mobile filter trigger, sort select -->
        <StoreListingToolbar
          :total="data?.total ?? 0"
          :sort="filters.sort"
          :has-query="Boolean(filters.q)"
          :active-filters-count="activeChips.length"
          @update:sort="handleSortChange"
          @open-filters="openFilters"
        />

        <!-- Removable Active Filter Chips -->
        <StoreListingActiveFilters
          :chips="activeChips"
          @clear="emit('clearFilters')"
        />

        <!-- Empty state when no products match -->
        <div v-if="data && data.items.length === 0 && !pending">
          <StoreListingEmpty
            :q="filters.q"
            @clear-filters="emit('clearFilters', false)"
          />
        </div>

        <!-- Product Cards Grid & Pagination -->
        <div v-else>
          <StoreListingGrid
            :products="data?.items ?? []"
            :pending="pending"
          />

          <StoreListingPagination
            v-if="data && data.total > 0"
            :page="filters.page"
            :page-size="data.pageSize || 24"
            :total="data.total"
            :filters="filters"
          />
        </div>
      </div>
    </div>

    <!-- Mobile Filter Sheet (Lazy mounted only after first tap) -->
    <LazyStoreListingFilterSheet
      v-if="filterSheetOpenedOnce"
      v-model:open="filterSheetOpen"
      :filters="filters"
      :facets="data?.facets"
      :fields="fields"
      :hide-brand="hideBrand"
      :base="base"
      :initial-total="data?.total ?? 0"
      @apply="emit('setFilters', $event)"
    />
  </div>
</template>
