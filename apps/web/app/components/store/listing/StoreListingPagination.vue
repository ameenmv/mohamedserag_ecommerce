<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import {
  patchListingFilters,
  toRouteQuery,
  type ListingFilters,
} from '~/utils/catalog-query'

const props = withDefaults(
  defineProps<{
    page: number
    pageSize?: number
    total: number
    filters: ListingFilters
  }>(),
  {
    pageSize: 24,
  },
)

const route = useRoute()
const { t } = useI18n()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function getPageUrl(targetPage: number) {
  const next = patchListingFilters(props.filters, { page: targetPage })
  return {
    path: route.path,
    query: toRouteQuery(next),
  }
}

const paginationItems = computed<Array<number | 'ellipsis'>>(() => {
  const current = props.page
  const total = totalPages.value

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const items: Array<number | 'ellipsis'> = [1]

  if (current > 3) {
    items.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    items.push(i)
  }

  if (current < total - 2) {
    items.push('ellipsis')
  }

  items.push(total)
  return items
})

function onPageClick() {
  if (import.meta.client) {
    const el =
      document.getElementById('listing-results-top') ||
      document.getElementById('store-main-content')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
</script>

<template>
  <nav
    v-if="totalPages > 1"
    :aria-label="t('store.listing.pagination.label')"
    class="mt-10 flex items-center justify-center gap-1.5 sm:gap-2"
  >
    <!-- Previous button -->
    <NuxtLink
      v-if="page > 1"
      :to="getPageUrl(page - 1)"
      :aria-label="t('store.listing.pagination.previous')"
      class="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      @click="onPageClick"
    >
      <ChevronLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
    </NuxtLink>
    <span
      v-else
      class="inline-flex size-11 cursor-not-allowed items-center justify-center rounded-xl border border-border/40 bg-muted/20 text-muted-foreground/40"
      aria-hidden="true"
    >
      <ChevronLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
    </span>

    <!-- Page numbers with compact window & ellipsis -->
    <template v-for="(item, idx) in paginationItems" :key="idx">
      <span
        v-if="item === 'ellipsis'"
        class="inline-flex size-11 items-center justify-center text-sm font-bold text-muted-foreground"
        aria-hidden="true"
      >
        …
      </span>

      <NuxtLink
        v-else
        :to="getPageUrl(item)"
        :aria-current="item === page ? 'page' : undefined"
        :aria-label="t('store.listing.pagination.page', { page: item })"
        :class="[
          'num inline-flex size-11 items-center justify-center rounded-xl text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
          item === page
            ? 'bg-serag-night text-serag-gold-hi shadow-xs dark:bg-serag-gold dark:text-serag-night'
            : 'border border-border bg-card text-foreground hover:border-serag-gold hover:bg-secondary',
        ]"
        @click="onPageClick"
      >
        {{ item }}
      </NuxtLink>
    </template>

    <!-- Next button -->
    <NuxtLink
      v-if="page < totalPages"
      :to="getPageUrl(page + 1)"
      :aria-label="t('store.listing.pagination.next')"
      class="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      @click="onPageClick"
    >
      <ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
    </NuxtLink>
    <span
      v-else
      class="inline-flex size-11 cursor-not-allowed items-center justify-center rounded-xl border border-border/40 bg-muted/20 text-muted-foreground/40"
      aria-hidden="true"
    >
      <ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
    </span>
  </nav>
</template>
