<script setup lang="ts">
import type { CatalogSort } from '@serag/shared'

const { t } = useI18n()

const {
  filters,
  data,
  pending,
  setFilters,
  clearFilters,
  activeChips,
} = await useListing()

const pageTitle = computed(() => {
  if (filters.value.q) {
    return t('store.listing.searchResultsTitle', { query: filters.value.q })
  }
  return t('store.listing.title')
})

const pageDescription = computed(() => t('store.listing.metaDescription'))

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
})

function handleSortUpdate(sort: CatalogSort) {
  setFilters({ sort })
}
</script>

<template>
  <StoreListingLayout
    :filters="filters"
    :data="data"
    :pending="pending"
    :active-chips="activeChips"
    @set-filters="setFilters"
    @clear-filters="clearFilters"
    @update-sort="handleSortUpdate"
  >
    <template #header>
      <!-- Breadcrumbs -->
      <StoreListingBreadcrumb :items="[{ label: pageTitle }]" />

      <!-- Page Heading & Intro -->
      <div class="flex flex-col gap-1.5">
        <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
          {{ pageTitle }}
        </h1>
        <p
          v-if="!filters.q"
          class="max-w-2xl text-sm text-muted-foreground sm:text-base"
        >
          {{ pageDescription }}
        </p>
      </div>
    </template>
  </StoreListingLayout>
</template>
