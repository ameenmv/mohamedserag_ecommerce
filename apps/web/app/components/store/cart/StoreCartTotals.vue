<script setup lang="ts">
import { ArrowLeft, ArrowRight, AlertCircle } from '@lucide/vue'
import { formatEgpWithUnit, type CartQuote } from '@serag/shared'

const props = defineProps<{
  quote?: CartQuote | null
  subtotal: number
  hasBlockingIssues: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  checkout: []
}>()

const { t, locale } = useI18n()

const displaySubtotal = computed(() => props.quote?.subtotal ?? props.subtotal)
const displayDiscount = computed(() => props.quote?.discount ?? 0)
const displayTotal = computed(() => props.quote?.total ?? props.subtotal)
const hasZone = computed(() => Boolean(props.quote?.zone))
const deliveryFee = computed(() => props.quote?.deliveryFee ?? 0)
</script>

<template>
  <div class="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
    <h3 class="text-lg font-bold text-foreground">
      {{ t('store.checkout.orderSummary') }}
    </h3>

    <div class="flex flex-col gap-2.5 text-sm">
      <!-- Subtotal -->
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.subtotal') }}</span>
        <span class="num font-bold text-foreground">{{ formatEgpWithUnit(displaySubtotal) }}</span>
      </div>

      <!-- Discount -->
      <div v-if="displayDiscount > 0" class="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
        <span>{{ t('store.cart.discount') }}</span>
        <span class="num font-bold">-{{ formatEgpWithUnit(displayDiscount) }}</span>
      </div>

      <!-- Delivery Fee -->
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.deliveryFee') }}</span>
        <span v-if="hasZone" class="num font-bold text-foreground">
          {{ formatEgpWithUnit(deliveryFee) }}
        </span>
        <span v-else class="text-xs text-muted-foreground">
          {{ t('store.cart.deliveryFeeNextStep') }}
        </span>
      </div>

      <div class="my-1 border-t border-border/60" />

      <!-- Total -->
      <div class="flex items-baseline justify-between">
        <span class="text-base font-bold text-foreground">{{ t('store.cart.total') }}</span>
        <span class="num text-xl font-extrabold text-serag-night dark:text-serag-gold">
          {{ formatEgpWithUnit(displayTotal) }}
        </span>
      </div>

      <!-- VAT Note -->
      <p class="text-[11px] text-muted-foreground">
        {{ t('store.checkout.vatNotice') }}
      </p>
    </div>

    <!-- Blocking Issues Alert -->
    <div
      v-if="hasBlockingIssues"
      class="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      <AlertCircle class="size-4.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{{ t('store.cart.issues.blockingNotice') }}</span>
    </div>

    <!-- Checkout Button -->
    <button
      type="button"
      :disabled="hasBlockingIssues || disabled"
      class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-serag-gold px-6 text-base font-bold text-serag-night shadow-sm transition-colors hover:bg-serag-gold-hi disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      @click="emit('checkout')"
    >
      <span>{{ t('store.cart.checkout') }}</span>
      <component
        :is="locale === 'ar' ? ArrowLeft : ArrowRight"
        class="size-4.5"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
