<script setup lang="ts">
import type { OrderThanksItem, OrderThanksDeposit } from '@serag/shared'

const props = defineProps<{
  items: OrderThanksItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  deposit: OrderThanksDeposit | null
  paymentMethodName: string
}>()

const { t } = useI18n()
const { money } = usePrice()

const remainingAmount = computed(() => {
  if (!props.deposit) return 0
  return Math.max(0, props.total - props.deposit.amount)
})
</script>

<template>
  <div class="flex flex-col gap-5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
    <h2 class="text-base font-bold text-foreground sm:text-lg">
      {{ t('store.thanks.summaryTitle') }}
    </h2>

    <!-- Items List -->
    <div class="flex flex-col divide-y divide-border/60">
      <div
        v-for="item in items"
        :key="item.modelCode + item.name"
        class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-bold text-foreground">
            {{ item.name }}
          </span>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="num">{{ item.modelCode }}</span>
            <span>•</span>
            <span>{{ t('store.cart.quantity') }}: <strong class="num text-foreground">{{ item.qty }}</strong></span>
            <span>•</span>
            <span class="num">{{ money(item.unitPrice) }}</span>
          </div>
        </div>

        <div class="text-end shrink-0">
          <span class="num text-sm font-bold text-foreground">
            {{ money(item.lineTotal) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Totals Breakdown -->
    <div class="flex flex-col gap-2.5 border-t border-border/60 pt-4 text-sm">
      <!-- Subtotal -->
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.subtotal') }}</span>
        <span class="num font-bold text-foreground">{{ money(subtotal) }}</span>
      </div>

      <!-- Discount -->
      <div v-if="discount > 0" class="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
        <span>{{ t('store.cart.discount') }}</span>
        <span class="num font-bold">-{{ money(discount) }}</span>
      </div>

      <!-- Delivery Fee -->
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.deliveryFee') }}</span>
        <span class="num font-bold text-foreground">{{ money(deliveryFee) }}</span>
      </div>

      <div class="my-1 border-t border-border/60" />

      <!-- Total -->
      <div class="flex items-baseline justify-between">
        <span class="text-base font-bold text-foreground">{{ t('store.cart.total') }}</span>
        <span class="num text-xl font-extrabold text-serag-night dark:text-serag-gold">
          {{ money(total) }}
        </span>
      </div>

      <!-- Deposit If Required -->
      <div
        v-if="deposit"
        class="mt-2 flex flex-col gap-2 rounded-2xl bg-muted/60 p-3.5 text-xs"
      >
        <div class="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
          <span>{{ t('store.thanks.depositRequired', { pct: deposit.pct }) }}</span>
          <span class="num font-extrabold">{{ money(deposit.amount) }}</span>
        </div>
        <div class="flex items-center justify-between text-muted-foreground font-semibold">
          <span>{{ t('store.thanks.remainingOnDelivery') }}</span>
          <span class="num font-bold text-foreground">{{ money(remainingAmount) }}</span>
        </div>
      </div>

      <!-- Payment Method -->
      <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
        <span>{{ t('store.thanks.paymentMethodLabel') }}</span>
        <span class="font-bold text-foreground">{{ paymentMethodName }}</span>
      </div>
    </div>
  </div>
</template>
