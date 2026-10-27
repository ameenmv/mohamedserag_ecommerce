<script setup lang="ts">
import type { AdminBrand, AdminCategory, AdminProductSort, AdminProductStatus } from '@serag/shared'
import { FileSpreadsheet, Plus, Search } from '@lucide/vue'

const props = defineProps<{
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

// The select has no empty value: '' (no filter) is carried as 'all'
const ALL = 'all'
const categoryOptions = computed(() => [
  { value: ALL, label: t('admin.products.allCategories') },
  ...props.categories.map((c) => ({ value: c.id, label: c.name })),
])
const brandOptions = computed(() => [
  { value: ALL, label: t('admin.products.allBrands') },
  ...props.brands.map((b) => ({ value: b.id, label: b.name })),
])
const statusOptions = computed(() =>
  (['all', 'active', 'hidden', 'archived'] as const).map((v) => ({ value: v, label: t(`admin.products.status.${v}`) })),
)
const stockOptions = computed(() => [
  { value: ALL, label: t('admin.products.stockFilter.all') },
  { value: 'low', label: t('admin.products.stockFilter.low') },
  { value: 'out', label: t('admin.products.stockFilter.out') },
])
const sortOptions = computed(() =>
  (['updated', 'name', 'price', 'stock'] as const).map((v) => ({ value: v, label: t(`admin.products.sort.${v}`) })),
)

const fromAll = (v: string): string => (v === ALL ? '' : v)
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
        <!-- `model-value`, not `value` + `@input`: the shadcn Input keeps its own v-model, and a
             plain `value` fought it, so each keystroke reset the field (only the last letters stuck). -->
        <Input
          :model-value="searchQuery"
          type="search"
          :placeholder="t('admin.products.searchPlaceholder')"
          class="h-11 ps-9 pe-4 rounded-xl text-sm"
          :aria-label="t('admin.products.searchPlaceholder')"
          @update:model-value="emit('update:searchQuery', String($event))"
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
    <div class="grid grid-cols-2 gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs sm:grid-cols-3 md:grid-cols-5">
      <AdminFormFilterSelect
        :model-value="selectedCategory || ALL"
        :options="categoryOptions"
        :label="t('admin.products.allCategories')"
        :neutral="ALL"
        @update:model-value="emit('update:selectedCategory', fromAll($event)); emit('change')"
      />
      <AdminFormFilterSelect
        :model-value="selectedBrand || ALL"
        :options="brandOptions"
        :label="t('admin.products.allBrands')"
        :neutral="ALL"
        @update:model-value="emit('update:selectedBrand', fromAll($event)); emit('change')"
      />
      <AdminFormFilterSelect
        :model-value="selectedStatus"
        :options="statusOptions"
        :label="t('admin.products.status.all')"
        neutral="all"
        @update:model-value="emit('update:selectedStatus', $event as AdminProductStatus); emit('change')"
      />
      <AdminFormFilterSelect
        :model-value="selectedStock || ALL"
        :options="stockOptions"
        :label="t('admin.products.stockFilter.all')"
        :neutral="ALL"
        @update:model-value="emit('update:selectedStock', fromAll($event) as 'low' | 'out' | ''); emit('change')"
      />
      <AdminFormFilterSelect
        :model-value="selectedSort"
        :options="sortOptions"
        :label="t('admin.products.sort.label')"
        class="col-span-2 sm:col-span-1"
        @update:model-value="emit('update:selectedSort', $event as AdminProductSort); emit('change')"
      />
    </div>
  </div>
</template>
