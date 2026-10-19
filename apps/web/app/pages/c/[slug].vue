<script setup lang="ts">
import type { CatalogSort } from '@serag/shared'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const storeApi = useStoreApi()

const slug = computed(() => String(route.params.slug ?? ''))

// Fetch category detail (breadcrumbs, children, spec template fields)
const { data: category, error: categoryError } = await useAsyncData(
  () => `category:${slug.value}`,
  () => storeApi.category(slug.value),
)

// PRD: 404 when category does not exist
if (categoryError.value || !category.value) {
  throw createError({ statusCode: 404, fatal: true })
}

const categoryFields = computed(() => category.value?.fields ?? [])

// URL-synced listing composable scoped to this category
const {
  filters,
  data,
  pending,
  setFilters,
  clearFilters,
  activeChips,
} = await useListing({
  category: slug,
  fields: categoryFields,
})

// SEO meta
const pageTitle = computed(
  () => category.value?.seoTitle || category.value?.name || t('store.listing.title'),
)
const pageDescription = computed(
  () =>
    category.value?.seoDescription ||
    category.value?.intro ||
    t('store.listing.metaDescription'),
)

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
})

const breadcrumbItems = computed(() => {
  const items: { label: string; to?: string }[] = []
  if (category.value?.parent) {
    items.push({
      label: category.value.parent.name,
      to: `/c/${category.value.parent.slug}`,
    })
  }
  items.push({
    label: category.value?.name ?? '',
  })
  return items
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
    :fields="categoryFields"
    :base="{ category: slug }"
    :active-chips="activeChips"
    @set-filters="setFilters"
    @clear-filters="clearFilters"
    @update-sort="handleSortUpdate"
  >
    <template #header>
      <!-- Breadcrumbs: Home (automatic) › parent › category -->
      <StoreListingBreadcrumb :items="breadcrumbItems" />

      <!-- Category Heading & Intro -->
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
          {{ category?.name }}
        </h1>
        <p
          v-if="category?.intro"
          class="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {{ category.intro }}
        </p>
      </div>

      <!-- Quiz entry (hidden when this category has no quiz) -->
      <StoreQuizEntry :slug="slug" />

      <!-- Sub-category chips linking to /c/<child> inside semantic <nav> -->
      <nav
        v-if="category?.children && category.children.length > 0"
        class="mt-4 flex flex-wrap items-center gap-2"
        :aria-label="t('store.listing.subcategories')"
      >
        <NuxtLink
          v-for="child in category.children"
          :key="child.id"
          :to="localePath(`/c/${child.slug}`)"
          class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <span>{{ child.name }}</span>
          <span
            v-if="child.productCount > 0"
            class="num text-[11px] text-muted-foreground"
          >
            ({{ child.productCount }})
          </span>
        </NuxtLink>
      </nav>
    </template>
  </StoreListingLayout>
</template>
