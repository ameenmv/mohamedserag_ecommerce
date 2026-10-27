<script setup lang="ts">
import { ArrowLeftRight, Check, Minus, Plus, X } from '@lucide/vue'
import type { ProductDetail } from '@serag/shared'
import {
  formatCompareValue,
  type CompareTableRow,
  type CompareTableResult,
} from '~/utils/compare-table'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'
import { toProductCard } from '~/utils/product-card-mapper'

const props = defineProps<{
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
const { money } = usePrice()
const localePath = useLocalePath()

const differenceCount = computed(() => props.tableData.rows.filter((r) => r.different).length)
const cheapestId = computed(() => {
  const prices = props.products.map((p) => p.price)
  if (prices.length < 2 || new Set(prices).size < 2) return null
  const min = Math.min(...prices)
  return props.products.find((p) => p.price === min)?.id ?? null
})

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
      <div class="space-y-4 rounded-3xl border border-border bg-card p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton v-for="i in 3" :key="i" class="h-64 rounded-2xl" />
        </div>
        <Skeleton v-for="i in 6" :key="i" class="h-12 w-full rounded-xl" />
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Title and controls -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="eyebrow text-serag-gold-ink dark:text-serag-gold-hi">{{ t('store.compare.eyebrow', { count: products.length }) }}</p>
          <h1 class="font-display mt-1 text-3xl text-foreground sm:text-4xl">
            {{ t('store.compare.title') }}
          </h1>
          <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
            {{ t('store.compare.subtitle', { max: MAX_COMPARE_ITEMS }) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div
            v-if="products.length >= 2"
            role="group"
            :aria-label="t('store.compare.viewAria')"
            class="inline-flex rounded-full border border-border bg-card p-1 text-xs font-bold sm:text-sm"
          >
            <button
              type="button"
              :aria-pressed="!showOnlyDifferences"
              :class="[
                'min-h-9 rounded-full px-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                !showOnlyDifferences ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="showOnlyDifferences = false"
            >
              {{ t('store.compare.allSpecs') }}
            </button>
            <button
              type="button"
              :aria-pressed="showOnlyDifferences"
              :class="[
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                showOnlyDifferences ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="showOnlyDifferences = true"
            >
              {{ t('store.compare.differencesOnly') }}
              <span class="num rounded-full bg-serag-gold/25 px-1.5 text-[11px] text-serag-gold-ink dark:text-serag-gold-hi">{{ differenceCount }}</span>
            </button>
          </div>

          <button
            type="button"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.compare.clearAria')"
            @click="emit('clear')"
          >
            <X class="size-3.5" aria-hidden="true" />
            {{ t('store.compare.clear') }}
          </button>
        </div>
      </div>

      <div
        v-if="tableData.isMixed"
        class="rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs font-semibold text-muted-foreground"
      >
        {{ t('store.compare.mixedCategoriesNotice') }}
      </div>

      <div class="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table class="w-full min-w-[640px] border-collapse text-start text-xs sm:text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                class="sticky start-0 z-20 w-28 min-w-28 border-b border-e border-border bg-secondary/50 p-3.5 text-start align-bottom backdrop-blur sm:w-44 sm:min-w-44 sm:p-4"
              >
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground sm:text-xs">
                  <ArrowLeftRight class="size-3.5" aria-hidden="true" />
                  {{ t('store.compare.productColumn') }}
                </span>
              </th>

              <th
                v-for="product in products"
                :key="product.id"
                scope="col"
                class="min-w-[180px] border-b border-e border-border p-3 align-top font-normal sm:min-w-[240px] sm:p-4"
              >
                <div class="flex flex-col gap-3">
                  <div class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-secondary/60 p-3">
                    <NuxtLink
                      :to="localePath(`/p/${product.slug}`)"
                      class="flex size-full items-center justify-center"
                      :aria-label="t('store.compare.viewProduct', { name: product.name })"
                      tabindex="-1"
                    >
                      <NuxtImg
                        v-if="product.image?.url"
                        :src="product.image.url"
                        :alt="product.image.alt || product.name"
                        width="240"
                        height="180"
                        class="size-full object-contain transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
                      />
                    </NuxtLink>
                    <span
                      v-if="cheapestId === product.id"
                      class="absolute top-2 start-2 rounded-full bg-serag-gold px-2.5 py-1 text-[11px] font-bold text-serag-night"
                    >
                      {{ t('store.compare.cheapest') }}
                    </span>
                    <button
                      type="button"
                      class="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      :aria-label="t('store.compare.removeAria', { name: product.name })"
                      @click="emit('remove', product.id)"
                    >
                      <X class="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <span class="text-[11px] font-bold tracking-wider text-serag-gold-ink uppercase dark:text-serag-gold-hi">
                      {{ product.brand.name }}
                    </span>
                    <h2 class="mt-0.5 line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug">
                      <NuxtLink
                        :to="localePath(`/p/${product.slug}`)"
                        class="text-foreground transition-colors hover:text-primary"
                      >
                        {{ product.name }}
                      </NuxtLink>
                    </h2>
                  </div>

                  <StoreProductPrice
                    :price="product.price"
                    :old-price="product.oldPrice"
                    :discount-percent="product.discountPercent"
                    :flash="product.flash"
                  />

                  <StoreProductAddToCart :product="toProductCard(product)" />
                </div>
              </th>

              <!-- Free slot: invites one more product -->
              <th
                v-if="products.length < MAX_COMPARE_ITEMS"
                scope="col"
                class="hidden min-w-[180px] border-b border-border p-3 align-top font-normal sm:table-cell sm:p-4"
              >
                <NuxtLink
                  :to="localePath('/shop')"
                  class="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-secondary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span class="flex size-11 items-center justify-center rounded-full bg-secondary">
                    <Plus class="size-5" aria-hidden="true" />
                  </span>
                  <span class="text-xs font-bold">{{ t('store.compare.addAnother') }}</span>
                </NuxtLink>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in displayedRows"
              :key="row.key"
              :class="['group transition-colors', row.different ? 'bg-serag-gold/[0.07]' : 'hover:bg-secondary/30']"
            >
              <th
                scope="row"
                :class="[
                  'sticky start-0 z-10 w-28 min-w-28 border-b border-e border-border bg-card p-3.5 text-start font-bold text-foreground sm:w-44 sm:min-w-44 sm:p-4',
                  row.different ? 'border-s-4 border-s-serag-gold' : '',
                ]"
              >
                <span>{{ getRowLabel(row) }}</span>
                <span v-if="row.different" class="sr-only">{{ t('store.compare.differentValue') }}</span>
              </th>

              <td
                v-for="(val, idx) in row.values"
                :key="idx"
                class="border-b border-e border-border p-3.5 text-foreground sm:p-4"
              >
                <span
                  v-if="row.type === 'price'"
                  :class="[
                    'num text-sm font-bold sm:text-base',
                    products[idx]?.id === cheapestId ? 'text-primary' : '',
                  ]"
                >
                  {{ money(val as number) }}
                </span>
                <span v-else-if="typeof val === 'boolean'" class="inline-flex items-center gap-1.5 font-semibold">
                  <span
                    :class="[
                      'flex size-5 items-center justify-center rounded-full',
                      val ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                    ]"
                  >
                    <Check v-if="val" class="size-3" aria-hidden="true" />
                    <Minus v-else class="size-3" aria-hidden="true" />
                  </span>
                  {{ formatCompareValue(val, row.unit, { yesLabel: t('store.productPage.specs.yes'), noLabel: t('store.productPage.specs.no') }) }}
                </span>
                <span v-else :class="['text-xs sm:text-sm', val === null || val === undefined ? 'text-muted-foreground' : '']">
                  {{ formatCompareValue(val, row.unit) }}
                </span>
              </td>
              <td v-if="products.length < MAX_COMPARE_ITEMS" class="hidden border-b border-border sm:table-cell" />
            </tr>

            <tr v-if="displayedRows.length === 0">
              <td
                :colspan="products.length + 1"
                class="p-8 text-center text-xs text-muted-foreground sm:text-sm"
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
