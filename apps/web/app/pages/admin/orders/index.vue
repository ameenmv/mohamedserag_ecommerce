<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { useAdminOrdersList } from '~/composables/useAdminOrdersList'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.orders.title') })
useAdminPageTitle('admin.nav.orders')

const {
  items,
  total,
  totalPages,
  tabs,
  loading,
  searchQuery,
  selectedMethod,
  dateFrom,
  dateTo,
  currentPage,
  pageSize,
  exportHref,
  onSearchInput,
  onStatusSelect,
  onFilterChange,
  onPageChange,
  clearFilters,
  fetchOrders,
} = useAdminOrdersList()

await fetchOrders()

const showingFrom = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * pageSize.value, total.value))
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header title -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.orders.title') }}
      </h1>
      <span class="num text-sm text-muted-foreground font-semibold">
        {{ t('admin.orders.pagination.showing', { from: showingFrom, to: showingTo, total }) }}
      </span>
    </div>

    <!-- Status Tabs -->
    <AdminOrdersListTabs
      :tabs="tabs"
      @select="onStatusSelect"
    />

    <!-- Toolbar -->
    <AdminOrdersListToolbar
      :search-query="searchQuery"
      :selected-method="selectedMethod"
      :date-from="dateFrom"
      :date-to="dateTo"
      :export-href="exportHref"
      @update:search-query="onSearchInput"
      @update:selected-method="selectedMethod = $event"
      @update:date-from="dateFrom = $event"
      @update:date-to="dateTo = $event"
      @change="onFilterChange"
      @clear="clearFilters"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="i in 5" :key="i" class="h-16 w-full rounded-2xl bg-muted/50 animate-pulse" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center"
    >
      <h3 class="font-display text-lg font-semibold text-foreground">
        {{ t('admin.orders.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('admin.orders.empty.description') }}
      </p>
      <button
        type="button"
        class="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-input bg-background px-4 text-xs font-bold text-foreground hover:bg-muted"
        @click="clearFilters"
      >
        {{ t('admin.orders.filters.clear') }}
      </button>
    </div>

    <!-- Orders Table & Mobile Cards -->
    <AdminOrdersListTable
      v-else
      :items="items"
    />

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex items-center justify-between gap-4 border-t border-border/80 pt-4 text-xs"
    >
      <button
        type="button"
        :disabled="currentPage <= 1 || loading"
        class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-input bg-card px-4 font-bold text-foreground hover:bg-muted disabled:opacity-40"
        @click="onPageChange(currentPage - 1)"
      >
        <ChevronRight class="size-4 rtl:rotate-0 rotate-180" aria-hidden="true" />
        <span>{{ t('admin.orders.pagination.prev') }}</span>
      </button>

      <span class="num font-semibold text-muted-foreground">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        type="button"
        :disabled="currentPage >= totalPages || loading"
        class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-input bg-card px-4 font-bold text-foreground hover:bg-muted disabled:opacity-40"
        @click="onPageChange(currentPage + 1)"
      >
        <span>{{ t('admin.orders.pagination.next') }}</span>
        <ChevronLeft class="size-4 rtl:rotate-0 rotate-180" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
