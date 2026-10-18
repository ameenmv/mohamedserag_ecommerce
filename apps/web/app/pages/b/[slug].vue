<script setup lang="ts">
import type { CatalogSort } from '@serag/shared'

const { t } = useI18n()
const route = useRoute()
const storeApi = useStoreApi()

const slug = computed(() => String(route.params.slug ?? ''))

// Fetch brand details
const { data: brand, error: brandError } = await useAsyncData(
  () => `brand:${slug.value}`,
  () => storeApi.brand(slug.value),
)

// PRD: 404 when brand does not exist
if (brandError.value || !brand.value) {
  throw createError({ statusCode: 404, fatal: true })
}

// URL-synced listing composable scoped to this brand (hideBrand: true)
const {
  filters,
  data,
  pending,
  setFilters,
  clearFilters,
  activeChips,
} = await useListing({
  brand: slug,
})

// SEO meta
const pageTitle = computed(
  () => brand.value?.seoTitle || brand.value?.name || t('store.listing.title'),
)
const pageDescription = computed(
  () =>
    brand.value?.seoDescription ||
    brand.value?.intro ||
    t('store.listing.metaDescription'),
)

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
})

const breadcrumbItems = computed(() => [
  { label: t('store.listing.breadcrumb.shop'), to: '/shop' },
  { label: brand.value?.name ?? '' },
])

function handleSortUpdate(sort: CatalogSort) {
  setFilters({ sort })
}
</script>

<template>
  <StoreListingLayout
    :filters="filters"
    :data="data"
    :pending="pending"
    :hide-brand="true"
    :base="{ brand: slug }"
    :active-chips="activeChips"
    @set-filters="setFilters"
    @clear-filters="clearFilters"
    @update-sort="handleSortUpdate"
  >
    <template #header>
      <!-- Breadcrumbs: Home (automatic) › Shop › brand -->
      <StoreListingBreadcrumb :items="breadcrumbItems" />

      <!-- Brand Heading with Logo and Intro -->
      <div class="flex items-center gap-4 sm:gap-6">
        <div
          v-if="brand?.logoUrl"
          class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xs sm:size-20"
        >
          <NuxtImg
            :src="brand.logoUrl"
            :alt="brand.name"
            width="80"
            height="80"
            class="size-full object-contain"
          />
        </div>
        <div class="flex flex-col gap-1">
          <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {{ brand?.name }}
          </h1>
          <p
            v-if="brand?.intro"
            class="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            {{ brand.intro }}
          </p>
        </div>
      </div>
    </template>
  </StoreListingLayout>
</template>
