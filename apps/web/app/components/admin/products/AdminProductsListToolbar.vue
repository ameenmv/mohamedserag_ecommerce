<script setup lang="ts">
import type { AdminBrand, AdminCategory, AdminProductSort, AdminProductStatus } from '@serag/shared'
import { FileSpreadsheet, Plus, Search } from '@lucide/vue'

defineProps<{
  searchQuery: string
  selectedCategory: string
  selectedBrand: string
  selectedStatus: AdminProductStatus
  selectedStock: 'low' | 'out' | ''
  selectedSort: AdminProductSort
  categories: AdminCategory[]
  brands: AdminBrand[]
}>()

const emit = defineEmits<{
  'update:searchQuery': [val: string]
  'update:selectedCategory': [val: string]
  'update:selectedBrand': [val: string]
  'update:selectedStatus': [val: AdminProductStatus]
  'update:selectedStock': [val: 'low' | 'out' | '']
  'update:selectedSort': [val: AdminProductSort]
  change: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Top row: Search & New Product -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <Search
          class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          :value="searchQuery"
          type="search"
          :placeholder="t('admin.products.searchPlaceholder')"
          class="h-11 ps-9 pe-4 rounded-xl text-sm"
          :aria-label="t('admin.products.searchPlaceholder')"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="flex items-center gap-2">
        <NuxtLink
          :to="localePath('/admin/products/import')"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 font-bold text-xs sm:text-sm text-foreground transition-all hover:bg-muted shadow-xs"
        >
          <FileSpreadsheet class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.products.import.button') }}</span>
        </NuxtLink>

        <NuxtLink
          :to="localePath('/admin/products/new')"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-serag-gold px-5 font-bold text-sm text-serag-ink transition-all hover:bg-serag-gold-hi shadow-xs"
        >
          <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
          <span>{{ t('admin.products.newProduct') }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Filters row -->
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
      <!-- Category Filter -->
      <AdminFormSelect
        :model-value="selectedCategory"
        :aria-label="t('admin.products.allCategories')"
        class="h-9 rounded-lg text-xs"
        @update:model-value="emit('update:selectedCategory', String($event)); emit('change')"
      >
        <option value="">
          {{ t('admin.products.allCategories') }}
        </option>
        <option v-for="c in categories" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </AdminFormSelect>

      <!-- Brand Filter -->
      <AdminFormSelect
        :model-value="selectedBrand"
        :aria-label="t('admin.products.allBrands')"
        class="h-9 rounded-lg text-xs"
        @update:model-value="emit('update:selectedBrand', String($event)); emit('change')"
      >
        <option value="">
          {{ t('admin.products.allBrands') }}
        </option>
        <option v-for="b in brands" :key="b.id" :value="b.id">
          {{ b.name }}
        </option>
      </AdminFormSelect>

      <!-- Status Filter -->
      <AdminFormSelect
        :model-value="selectedStatus"
        :aria-label="t('admin.products.status.all')"
        class="h-9 rounded-lg text-xs"
        @update:model-value="emit('update:selectedStatus', $event as AdminProductStatus); emit('change')"
      >
        <option value="all">
          {{ t('admin.products.status.all') }}
        </option>
        <option value="active">
          {{ t('admin.products.status.active') }}
        </option>
        <option value="hidden">
          {{ t('admin.products.status.hidden') }}
        </option>
        <option value="archived">
          {{ t('admin.products.status.archived') }}
        </option>
      </AdminFormSelect>

      <!-- Stock Filter -->
      <AdminFormSelect
        :model-value="selectedStock"
        :aria-label="t('admin.products.stockFilter.all')"
        class="h-9 rounded-lg text-xs"
        @update:model-value="emit('update:selectedStock', $event as 'low' | 'out' | ''); emit('change')"
      >
        <option value="">
          {{ t('admin.products.stockFilter.all') }}
        </option>
        <option value="low">
          {{ t('admin.products.stockFilter.low') }}
        </option>
        <option value="out">
          {{ t('admin.products.stockFilter.out') }}
        </option>
      </AdminFormSelect>

      <!-- Sort -->
      <AdminFormSelect
        :model-value="selectedSort"
        :aria-label="t('admin.products.sort.label')"
        class="col-span-2 sm:col-span-1 h-9 rounded-lg text-xs"
        @update:model-value="emit('update:selectedSort', $event as AdminProductSort); emit('change')"
      >
        <option value="updated">
          {{ t('admin.products.sort.updated') }}
        </option>
        <option value="name">
          {{ t('admin.products.sort.name') }}
        </option>
        <option value="price">
          {{ t('admin.products.sort.price') }}
        </option>
        <option value="stock">
          {{ t('admin.products.sort.stock') }}
        </option>
      </AdminFormSelect>
    </div>
  </div>
</template>
