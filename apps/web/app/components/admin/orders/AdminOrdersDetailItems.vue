<script setup lang="ts">
import type {
  AdminOrderDeposit,
  AdminOrderItem,
} from '@serag/shared'
import { Package } from '@lucide/vue'

defineProps<{
  items: AdminOrderItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  deposit: AdminOrderDeposit | null
  paidAmount: number
  remaining: number
}>()

const { t } = useI18n()
const { money } = usePrice()
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-5 min-w-0">
    <div class="flex items-center gap-2 border-b border-border/60 pb-3">
      <Package class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <h2 class="text-sm font-bold text-foreground">
        {{ t('admin.orders.detail.itemsTitle') }}
      </h2>
    </div>

    <!-- Items list / table -->
    <div class="overflow-x-auto">
      <table class="w-full text-start text-xs">
        <thead class="border-b border-border/60 text-muted-foreground font-bold">
          <tr>
            <th class="py-2.5 text-start">{{ t('admin.orders.detail.item') }}</th>
            <th class="py-2.5 text-start">{{ t('admin.orders.detail.modelCode') }}</th>
            <th class="py-2.5 text-center">{{ t('admin.orders.detail.qty') }}</th>
            <th class="py-2.5 text-start">{{ t('admin.orders.detail.unitPrice') }}</th>
            <th class="py-2.5 text-end">{{ t('admin.orders.detail.lineTotal') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/40">
          <tr v-for="(it, idx) in items" :key="idx">
            <td class="py-3 font-semibold text-foreground pe-3">
              {{ it.name }}
            </td>
            <td class="py-3 font-mono text-muted-foreground whitespace-nowrap pe-3">
              {{ it.modelCode }}
            </td>
            <td class="py-3 text-center num font-bold px-2">
              {{ it.qty }}
            </td>
            <td class="py-3 num whitespace-nowrap text-muted-foreground pe-3">
              {{ money(it.unitPrice) }}
            </td>
            <td class="py-3 num font-bold text-foreground text-end whitespace-nowrap">
              {{ money(it.lineTotal) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals Summary -->
    <div class="border-t border-border/60 pt-4 flex flex-col gap-2 max-w-sm ms-auto w-full text-xs">
      <div class="flex justify-between items-center text-muted-foreground">
        <span>{{ t('admin.orders.detail.subtotal') }}:</span>
        <span class="num font-semibold">{{ money(subtotal) }}</span>
      </div>

      <div v-if="discount > 0" class="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
        <span>{{ t('admin.orders.detail.discount') }}:</span>
        <span class="num font-semibold">-{{ money(discount) }}</span>
      </div>

      <div class="flex justify-between items-center text-muted-foreground">
        <span>{{ t('admin.orders.detail.deliveryFee') }}:</span>
        <span class="num font-semibold">{{ money(deliveryFee) }}</span>
      </div>

      <div class="flex justify-between items-center text-base font-bold text-foreground border-t border-border/80 pt-2">
        <span>{{ t('admin.orders.detail.total') }}:</span>
        <span class="num text-serag-night dark:text-serag-gold font-bold">
          {{ money(total) }}
        </span>
      </div>

      <div v-if="deposit" class="flex justify-between items-center text-amber-800 dark:text-amber-300">
        <span>{{ t('admin.orders.detail.deposit') }} ({{ deposit.pct }}%):</span>
        <span class="num font-bold">{{ money(deposit.amount) }}</span>
      </div>

      <div class="flex justify-between items-center text-muted-foreground">
        <span>{{ t('admin.orders.detail.paid') }}:</span>
        <span class="num font-bold text-foreground">{{ money(paidAmount) }}</span>
      </div>

      <div class="flex justify-between items-center text-xs font-bold border-t border-dashed border-border/80 pt-1.5">
        <span>{{ t('admin.orders.detail.remaining') }}:</span>
        <span class="num text-base font-bold" :class="remaining > 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'">
          {{ money(remaining) }}
        </span>
      </div>
    </div>
  </div>
</template>
