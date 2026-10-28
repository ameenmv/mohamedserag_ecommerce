<script setup lang="ts">
import {
  PAYMENT_METHODS,
  type OrderType,
  type PaymentMethod,
} from '@serag/shared'
import { Download, RotateCcw, Search, X } from '@lucide/vue'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  searchQuery: string
  selectedType: OrderType | 'all'
  selectedMethod: PaymentMethod | 'all'
  dateFrom: string
  dateTo: string
  lockExpiring?: number
  exportHref: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [val: string]
  'update:selectedType': [val: OrderType | 'all']
  'update:selectedMethod': [val: PaymentMethod | 'all']
  'update:dateFrom': [val: string]
  'update:dateTo': [val: string]
  change: []
  clear: []
  clearLockExpiring: []
}>()

const { t } = useI18n()

const typeOptions = computed(() => [
  { value: 'all', label: t('admin.orders.filters.allTypes') },
  { value: 'order', label: t('admin.orders.types.order') },
  { value: 'bridal', label: t('admin.orders.types.bridal') },
])

const methodOptions = computed(() => [
  { value: 'all', label: t('admin.orders.filters.allMethods') },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: t(`admin.orders.paymentMethods.${m}`) })),
])

const activeCount = computed(
  () =>
    [props.selectedType !== 'all', props.selectedMethod !== 'all', props.dateFrom !== '', props.dateTo !== ''].filter(Boolean).length,
)

function setType(v: string): void {
  emit('update:selectedType', v as OrderType | 'all')
  emit('change')
}
function setMethod(v: string): void {
  emit('update:selectedMethod', v as PaymentMethod | 'all')
  emit('change')
}
function setFrom(v: string): void {
  emit('update:dateFrom', v)
  emit('change')
}
function setTo(v: string): void {
  emit('update:dateTo', v)
  emit('change')
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <div class="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4">
      <!-- Search and export -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative min-w-0 flex-1">
          <Search
            class="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            :model-value="searchQuery"
            type="search"
            :placeholder="t('admin.orders.searchPlaceholder')"
            :aria-label="t('admin.orders.searchPlaceholder')"
            class="h-11 rounded-xl ps-10"
            @update:model-value="emit('update:searchQuery', String($event ?? ''))"
          />
        </div>
        <a
          :href="exportHref"
          download
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-xs font-bold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
        >
          <Download class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.orders.exportCsv') }}</span>
        </a>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-2 items-end gap-2.5 border-t border-border pt-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <AdminFormFilterSelect
          :model-value="selectedType"
          :options="typeOptions"
          :label="t('admin.orders.filters.allTypes')"
          neutral="all"
          @update:model-value="setType"
        />
        <AdminFormFilterSelect
          :model-value="selectedMethod"
          :options="methodOptions"
          :label="t('admin.orders.filters.allMethods')"
          neutral="all"
          @update:model-value="setMethod"
        />
        <AdminFormDatePicker
          :model-value="dateFrom"
          :label="t('admin.orders.filters.from')"
          :max="dateTo || undefined"
          @update:model-value="setFrom"
        />
        <AdminFormDatePicker
          :model-value="dateTo"
          :label="t('admin.orders.filters.to')"
          :min="dateFrom || undefined"
          @update:model-value="setTo"
        />
        <button
          type="button"
          :disabled="activeCount === 0"
          class="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 lg:col-span-1"
          @click="emit('clear')"
        >
          <RotateCcw class="size-3.5" aria-hidden="true" />
          <span>{{ t('admin.orders.filters.clear') }}</span>
          <span
            v-if="activeCount > 0"
            class="num grid size-5 place-items-center rounded-full bg-serag-gold text-[11px] text-serag-night"
          >{{ activeCount }}</span>
        </button>
      </div>
    </div>

    <!-- Removable lock-expiry filter chip -->
    <div v-if="lockExpiring" class="flex items-center gap-2">
      <span class="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-serag-green/30 bg-serag-green/10 px-3 text-[11px] font-bold text-serag-green dark:border-serag-gold/30 dark:bg-serag-gold/10 dark:text-serag-gold">
        {{ t('admin.orders.filters.lockExpiring', { days: 7 }) }}
        <button
          type="button"
          class="grid size-5 place-items-center rounded-full transition-colors hover:bg-serag-green/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
          :aria-label="t('admin.orders.filters.removeLockExpiring')"
          @click="emit('clearLockExpiring')"
        >
          <X class="size-3" aria-hidden="true" />
        </button>
      </span>
    </div>
  </div>
</template>
