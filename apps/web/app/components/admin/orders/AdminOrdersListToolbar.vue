<script setup lang="ts">
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@serag/shared'
import { Download, RotateCcw, Search } from '@lucide/vue'

defineProps<{
  searchQuery: string
  selectedMethod: PaymentMethod | 'all'
  dateFrom: string
  dateTo: string
  exportHref: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [val: string]
  'update:selectedMethod': [val: PaymentMethod | 'all']
  'update:dateFrom': [val: string]
  'update:dateTo': [val: string]
  change: []
  clear: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3 min-w-0">
    <!-- Top row: Search & CSV Export -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <Search
          class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          :value="searchQuery"
          type="search"
          :placeholder="t('admin.orders.searchPlaceholder')"
          class="border-input bg-background h-11 w-full rounded-xl border ps-9 pe-4 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="t('admin.orders.searchPlaceholder')"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div class="flex items-center gap-2">
        <a
          :href="exportHref"
          download
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 text-xs font-bold sm:text-sm text-foreground shadow-xs transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.orders.exportCsv') }}</span>
        </a>
      </div>
    </div>

    <!-- Filters row: Payment Method, Date Range, Clear -->
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4 min-w-0">
      <!-- Payment Method Filter -->
      <AdminFormSelect
        :model-value="selectedMethod"
        :aria-label="t('admin.orders.filters.allMethods')"
        class="h-10 rounded-xl text-xs"
        @update:model-value="emit('update:selectedMethod', $event as PaymentMethod | 'all'); emit('change')"
      >
        <option value="all">
          {{ t('admin.orders.filters.allMethods') }}
        </option>
        <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">
          {{ t(`admin.orders.paymentMethods.${method}`) }}
        </option>
      </AdminFormSelect>

      <!-- Date From -->
      <!-- Visible label: the native date field only shows a format placeholder. -->
      <label class="flex flex-col gap-1 text-[11px] font-bold text-muted-foreground">
        <span>{{ t('admin.orders.filters.from') }}</span>
        <input
          :value="dateFrom"
          type="date"
          class="border-input bg-background h-10 w-full rounded-xl border px-3 text-xs shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          @input="emit('update:dateFrom', ($event.target as HTMLInputElement).value); emit('change')"
        >
      </label>

      <!-- Date To -->
      <!-- Visible label: the native date field only shows a format placeholder. -->
      <label class="flex flex-col gap-1 text-[11px] font-bold text-muted-foreground">
        <span>{{ t('admin.orders.filters.to') }}</span>
        <input
          :value="dateTo"
          type="date"
          class="border-input bg-background h-10 w-full rounded-xl border px-3 text-xs shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          @input="emit('update:dateTo', ($event.target as HTMLInputElement).value); emit('change')"
        >
      </label>

      <!-- Clear Filters -->
      <button
        type="button"
        class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-background px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('clear')"
      >
        <RotateCcw class="size-3.5" aria-hidden="true" />
        <span>{{ t('admin.orders.filters.clear') }}</span>
      </button>
    </div>
  </div>
</template>
