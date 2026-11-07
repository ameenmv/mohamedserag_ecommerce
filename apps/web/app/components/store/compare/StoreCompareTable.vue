<script setup lang="ts">
import { AlertCircle, SlidersHorizontal, Trash2 } from '@lucide/vue'
import type { ProductCard, ProductDetail } from '@serag/shared'
import {
  groupCompareRows,
  type CompareTableRow,
  type CompareTableResult,
} from '~/utils/compare-table'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'

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
  productAdded: [product: ProductCard]
}>()

const { t } = useI18n()

const differenceCount = computed(() => props.tableData.rows.filter((r) => r.different).length)
const totalRowCount = computed(() => props.tableData.rows.length)

const rowGroups = computed(() => groupCompareRows(props.displayedRows))
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
      <!-- Title, Subtitle, and Controls Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="eyebrow text-serag-gold-ink dark:text-serag-gold-hi">
            {{ t('store.compare.eyebrow', { count: products.length }) }}
          </p>
          <h1 class="title-draw font-display mt-1 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            <CommonMadText :text="t('store.compare.title')" size="xl" />
          </h1>
          <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
            {{ t('store.compare.subtitle', { max: MAX_COMPARE_ITEMS }) }}
          </p>
        </div>

        <!-- Controls: Differences switch & Clear -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Differences Switch with Count -->
          <div
            v-if="products.length >= 2"
            class="inline-flex items-center gap-2.5 rounded-full border border-border bg-card p-1 shadow-2xs"
          >
            <div
              role="group"
              :aria-label="t('store.compare.viewAria')"
              class="inline-flex rounded-full bg-secondary/50 p-0.5 text-xs font-bold"
            >
              <button
                type="button"
                :aria-pressed="!showOnlyDifferences"
                :class="[
                  'min-h-9 rounded-full px-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer',
                  !showOnlyDifferences
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
                @click="showOnlyDifferences = false"
              >
                {{ t('store.compare.allSpecs') }}
              </button>
              <button
                type="button"
                :aria-pressed="showOnlyDifferences"
                :class="[
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer',
                  showOnlyDifferences
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
                @click="showOnlyDifferences = true"
              >
                <SlidersHorizontal class="size-3.5" aria-hidden="true" />
                <span>{{ t('store.compare.differencesOnly') }}</span>
              </button>
            </div>

            <!-- "5 فروقات من 9 مواصفات" badge -->
            <span class="num pe-2 text-xs font-semibold text-muted-foreground">
              {{ t('store.compare.differencesCount', { diff: differenceCount, total: totalRowCount }) }}
            </span>
          </div>

          <!-- Clear comparison list button -->
          <button
            type="button"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
            :aria-label="t('store.compare.clearAria')"
            @click="emit('clear')"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
            <span>{{ t('store.compare.clear') }}</span>
          </button>
        </div>
      </div>

      <!-- Editorial Summary Card above table -->
      <StoreCompareSummary
        :products="products"
        :rows="tableData.rows"
      />

      <!-- Mixed Categories Notice -->
      <div
        v-if="tableData.isMixed"
        class="flex items-center gap-2.5 rounded-2xl border border-serag-gold/30 bg-serag-gold/10 p-3.5 text-xs font-semibold text-serag-gold-ink dark:text-serag-gold-hi"
        role="status"
      >
        <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.compare.mixedCategoriesNotice') }}</span>
      </div>

      <!-- Comparison Table Container: Horizontal scroll with snap on mobile -->
      <!-- Sideways scrolling only below lg: a scroll container would stop the product header row from sticking -->
      <div class="relative overflow-x-auto rounded-3xl border border-border bg-card shadow-sm snap-x snap-mandatory scroll-smooth lg:overflow-visible">
        <table class="w-full min-w-[620px] border-collapse text-start text-xs sm:text-sm">
          <!-- Sticky Header Row with real-height offset from floating site header -->
          <StoreCompareHeaderRow
            :products="products"
            @remove="emit('remove', $event)"
            @product-added="emit('productAdded', $event)"
          />

          <!-- Grouped Spec Rows with Winner Badges -->
          <tbody class="divide-y divide-border/60">
            <template v-for="group in rowGroups" :key="group.id">
              <StoreCompareSpecGroup
                :group="group"
                :product-count="products.length"
              />
            </template>

            <!-- Empty rows notice when showOnlyDifferences filters out everything -->
            <tr v-if="displayedRows.length === 0">
              <td
                :colspan="products.length < MAX_COMPARE_ITEMS ? products.length + 2 : products.length + 1"
                class="p-10 text-center text-xs text-muted-foreground sm:text-sm"
              >
                <p class="font-bold text-foreground">
                  {{ t('store.compare.noDifferencesNotice') }}
                </p>
                <button
                  type="button"
                  class="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-secondary px-4 text-xs font-bold text-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                  @click="showOnlyDifferences = false"
                >
                  {{ t('store.compare.allSpecs') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
