<script setup lang="ts">
import { X } from '@lucide/vue'
import type { ProductDetail } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import {
  formatCompareValue,
  type CompareTableRow,
  type CompareTableResult,
} from '~/utils/compare-table'
import { toProductCard } from '~/utils/product-card-mapper'

defineProps<{
  products: readonly ProductDetail[]
  tableData: CompareTableResult
  displayedRows: readonly CompareTableRow[]
  loading?: boolean
}>()

const showOnlyDifferences = defineModel<boolean>('showOnlyDifferences', {
  default: false,
})

const emit = defineEmits<{
  remove: [id: string]
  clear: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

function getRowLabel(row: { key: string; label: string; type: string }): string {
  if (row.type === 'price') return t('store.compare.price')
  if (row.type === 'brand') return t('store.compare.brand')
  if (row.type === 'warranty') return t('store.compare.warranty')
  if (row.type === 'origin') return t('store.compare.origin')
  return row.label
}
</script>

<template>
  <div>
    <!-- Loading Skeletons -->
    <div v-if="loading" aria-busy="true" class="space-y-6">
      <div class="space-y-2">
        <Skeleton class="h-10 w-48 rounded-xl" />
        <Skeleton class="h-4 w-80 rounded-md" />
      </div>
      <div class="rounded-3xl border border-border bg-card p-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton v-for="i in 3" :key="i" class="h-44 rounded-2xl" />
        </div>
        <Skeleton v-for="i in 6" :key="i" class="h-12 w-full rounded-xl" />
      </div>
    </div>

    <!-- Loaded Comparison Content -->
    <div v-else class="space-y-6">
      <!-- Title & Actions Row -->
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 class="font-display text-3xl sm:text-4xl text-foreground">
            {{ t('store.compare.title') }}
          </h1>
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            {{ t('store.compare.subtitle') }}
          </p>
        </div>

        <!-- Differences filter toggle + Clear -->
        <div class="flex flex-wrap items-center gap-4">
          <label
            v-if="products.length >= 2"
            class="inline-flex min-h-11 items-center gap-2 text-xs font-semibold sm:text-sm cursor-pointer select-none"
          >
            <input
              v-model="showOnlyDifferences"
              type="checkbox"
              class="size-4.5 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
            <span>{{ t('store.compare.showDifferencesOnly') }}</span>
          </label>

          <button
            type="button"
            class="inline-flex min-h-11 items-center px-2 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.compare.clearAria')"
            @click="emit('clear')"
          >
            {{ t('store.compare.clear') }}
          </button>
        </div>
      </div>

      <!-- Mixed categories notice -->
      <div
        v-if="tableData.isMixed"
        class="rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs font-semibold text-muted-foreground"
      >
        {{ t('store.compare.mixedCategoriesNotice') }}
      </div>

      <!-- Horizontally Scrollable Table with Sticky Column -->
      <div class="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table class="w-full border-collapse text-start text-xs sm:text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/20">
              <!-- Sticky Column Header -->
              <th
                scope="col"
                class="sticky start-0 z-20 w-28 min-w-28 sm:w-44 sm:min-w-44 border-e border-border bg-card p-3.5 text-start font-bold text-muted-foreground shadow-xs sm:p-4"
              >
                {{ t('store.compare.productColumn') }}
              </th>

              <!-- Product Columns Header Cells -->
              <th
                v-for="product in products"
                :key="product.id"
                scope="col"
                class="min-w-[170px] sm:min-w-[240px] border-e border-border p-3.5 text-start align-top font-normal last:border-e-0 sm:p-4"
              >
                <div class="flex flex-col gap-3">
                  <!-- Thumbnail with remove button -->
                  <div
                    class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-serag-ivory/60 p-2 dark:bg-muted/30"
                  >
                    <NuxtImg
                      v-if="product.image?.url"
                      :src="product.image.url"
                      :alt="product.image.alt || product.name"
                      width="200"
                      height="200"
                      class="size-full object-contain"
                    />
                    <button
                      type="button"
                      class="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      :aria-label="t('store.compare.removeAria', { name: product.name })"
                      @click="emit('remove', product.id)"
                    >
                      <X class="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <!-- Brand & Name link -->
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-serag-gold sm:text-[11px]">
                      {{ product.brand.name }}
                    </span>
                    <h2 class="mt-0.5 line-clamp-2 text-xs font-bold leading-snug sm:text-sm">
                      <NuxtLink
                        :to="localePath(`/p/${product.slug}`)"
                        class="text-foreground transition-colors hover:text-serag-night dark:hover:text-serag-gold-hi"
                      >
                        {{ product.name }}
                      </NuxtLink>
                    </h2>
                  </div>

                  <!-- Price -->
                  <StoreProductPrice
                    :price="product.price"
                    :old-price="product.oldPrice"
                    :discount-percent="product.discountPercent"
                  />

                  <!-- Add to Cart -->
                  <StoreProductAddToCart :product="toProductCard(product)" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-border">
            <tr
              v-for="row in displayedRows"
              :key="row.key"
              :class="[
                'transition-colors',
                row.different ? 'bg-serag-gold/10 dark:bg-serag-gold/15' : 'hover:bg-muted/20',
              ]"
            >
              <!-- Sticky Row Header -->
              <th
                scope="row"
                class="sticky start-0 z-10 w-28 min-w-28 sm:w-44 sm:min-w-44 border-e border-border bg-card p-3.5 text-start font-bold text-foreground shadow-xs sm:p-4"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ getRowLabel(row) }}</span>
                  <span
                    v-if="row.different"
                    class="size-1.5 shrink-0 rounded-full bg-serag-gold"
                    :title="t('store.compare.differentValue')"
                    aria-hidden="true"
                  />
                </div>
              </th>

              <!-- Data Cells -->
              <td
                v-for="(val, idx) in row.values"
                :key="idx"
                class="border-e border-border p-3.5 text-foreground last:border-e-0 sm:p-4"
              >
                <span
                  v-if="row.type === 'price'"
                  class="num font-bold text-foreground text-sm sm:text-base"
                >
                  {{ formatEgpWithUnit(val as number) }}
                </span>
                <span v-else class="text-xs sm:text-sm">
                  {{
                    formatCompareValue(val, row.unit, {
                      yesLabel: t('store.product.specs.yes'),
                      noLabel: t('store.product.specs.no'),
                    })
                  }}
                </span>
              </td>
            </tr>

            <!-- Notice when differences filter has no rows -->
            <tr v-if="displayedRows.length === 0">
              <td
                :colspan="products.length + 1"
                class="p-8 text-center text-xs sm:text-sm text-muted-foreground"
              >
                {{ t('store.compare.noDifferencesNotice') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
