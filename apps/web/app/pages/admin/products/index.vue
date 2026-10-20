<script setup lang="ts">
import { ChevronLeft, ChevronRight, Loader2 } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminProductsList } from '~/composables/useAdminProductsList'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.products.title') })
useAdminPageTitle('admin.nav.products')

const {
  items,
  total,
  totalPages,
  loading,
  categories,
  brands,
  searchQuery,
  selectedCategory,
  selectedBrand,
  selectedStatus,
  selectedStock,
  selectedSort,
  currentPage,
  confirmDeleteProduct,
  inOrdersProduct,
  actionLoading,
  onSearchInput,
  onFilterChange,
  onPageChange,
  clearFilters,
  toggleVisibility,
  toggleArchive,
  promptDelete,
  executeDelete,
  archiveInsteadOfDelete,
} = useAdminProductsList()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header title -->
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.products.title') }}
      </h1>
      <span class="num text-sm text-muted-foreground font-semibold">
        {{ t('admin.products.pagination.total', { total }) }}
      </span>
    </div>

    <!-- Toolbar -->
    <AdminProductsListToolbar
      :search-query="searchQuery"
      :selected-category="selectedCategory"
      :selected-brand="selectedBrand"
      :selected-status="selectedStatus"
      :selected-stock="selectedStock"
      :selected-sort="selectedSort"
      :categories="categories"
      :brands="brands"
      @update:search-query="onSearchInput"
      @update:selected-category="selectedCategory = $event"
      @update:selected-brand="selectedBrand = $event"
      @update:selected-status="selectedStatus = $event"
      @update:selected-stock="selectedStock = $event"
      @update:selected-sort="selectedSort = $event"
      @change="onFilterChange"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col gap-3">
      <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-2xl" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center"
    >
      <h3 class="font-display text-lg font-semibold text-foreground">
        {{ t('admin.products.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('admin.products.empty.description') }}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-4 rounded-xl"
        @click="clearFilters"
      >
        {{ t('admin.products.empty.clearFilters') }}
      </Button>
    </div>

    <!-- Table & Cards -->
    <template v-else>
      <AdminProductsListTable
        :products="items"
        :loading="loading"
        @toggle-visibility="toggleVisibility"
        @toggle-archive="toggleArchive"
        @delete-product="promptDelete"
      />

      <!-- Pagination -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <span class="num text-xs text-muted-foreground">
          {{ t('admin.products.pagination.page', { page: currentPage, totalPages }) }}
        </span>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="currentPage <= 1 || loading"
            class="gap-1 rounded-lg text-xs"
            @click="onPageChange(currentPage - 1)"
          >
            <ChevronLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
            <span>{{ t('admin.products.pagination.previous') }}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="currentPage >= totalPages || loading"
            class="gap-1 rounded-lg text-xs"
            @click="onPageChange(currentPage + 1)"
          >
            <span>{{ t('admin.products.pagination.next') }}</span>
            <ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </template>

    <!-- 1. Delete Confirmation Dialog -->
    <Dialog :open="Boolean(confirmDeleteProduct)" @update:open="confirmDeleteProduct = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.products.actions.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm">
            {{
              t('admin.products.actions.confirmDeleteDescription', {
                name: confirmDeleteProduct?.name || '',
              })
            }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="actionLoading"
            @click="confirmDeleteProduct = null"
          >
            {{ t('admin.products.actions.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="actionLoading"
            @click="executeDelete"
          >
            <Loader2 v-if="actionLoading" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ t('admin.products.actions.confirmDelete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 2. IN_ORDERS Explanation Dialog -->
    <Dialog :open="Boolean(inOrdersProduct)" @update:open="inOrdersProduct = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-amber-600 dark:text-amber-400">
            {{ t('admin.products.inOrdersDialog.title') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.products.inOrdersDialog.description') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="actionLoading"
            @click="inOrdersProduct = null"
          >
            {{ t('admin.products.inOrdersDialog.close') }}
          </Button>
          <Button
            type="button"
            class="bg-serag-night text-serag-gold hover:bg-serag-green font-bold"
            :disabled="actionLoading"
            @click="archiveInsteadOfDelete"
          >
            <Loader2 v-if="actionLoading" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ t('admin.products.inOrdersDialog.archiveAction') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
