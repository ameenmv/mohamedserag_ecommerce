<script setup lang="ts">
import { ChevronDown, Tag, AlertTriangle, ShieldCheck } from '@lucide/vue'
import { formatEgpWithUnit, type CartQuote } from '@serag/shared'
import type { CartLine } from '~/utils/cart'

const props = defineProps<{
  lines: CartLine[]
  quote: CartQuote | null
  subtotal: number
  couponCode: string
  submitting: boolean
  hydrated: boolean
  disabled?: boolean
  hint?: string | null
}>()

const emit = defineEmits<{
  'update:couponCode': [code: string]
  'apply-coupon': []
  submit: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const showCoupon = ref(false)
const localCouponInput = ref(props.couponCode)

const displaySubtotal = computed(() => props.quote?.subtotal ?? props.subtotal)
const displayDiscount = computed(() => props.quote?.discount ?? 0)
const displayTotal = computed(() => props.quote?.total ?? props.subtotal)
const deliveryFee = computed(() => props.quote?.deliveryFee ?? 0)
const hasZone = computed(() => Boolean(props.quote?.zone))

const codDeposit = computed(() => props.quote?.codDeposit)

function handleApplyCoupon(): void {
  emit('update:couponCode', localCouponInput.value.trim())
  emit('apply-coupon')
}
</script>

<template>
  <div class="flex flex-col gap-5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
    <h2 class="text-lg font-bold text-foreground">
      {{ t('store.checkout.orderSummary') }}
    </h2>

    <!-- Items Preview -->
    <div class="flex flex-col divide-y divide-border/60">
      <div
        v-for="line in lines"
        :key="line.productId"
        class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <NuxtLink
            :to="localePath(`/p/${line.slug}`)"
            class="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/40"
          >
            <img
              v-if="line.image"
              :src="line.image"
              :alt="line.name"
              class="size-full object-contain p-0.5"
              loading="lazy"
            >
            <div v-else class="flex size-full items-center justify-center text-[10px] text-muted-foreground">
              Serag
            </div>
          </NuxtLink>

          <div class="flex flex-col min-w-0">
            <span class="line-clamp-1 text-xs font-bold text-foreground">
              {{ line.name }}
            </span>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{{ t('store.cart.quantity') }}:</span>
              <span class="num font-semibold text-foreground">{{ line.qty }}</span>
            </div>

            <!-- On-request lead time text -->
            <p
              v-if="quote?.lines.find((l) => l.productId === line.productId)?.leadTimeText"
              class="text-[11px] text-amber-700 dark:text-amber-400 font-medium"
            >
              {{ t('store.checkout.leadTimePrefix') }}
              {{ quote?.lines.find((l) => l.productId === line.productId)?.leadTimeText }}
            </p>
          </div>
        </div>

        <div class="text-end shrink-0">
          <span class="num text-sm font-bold text-foreground">
            {{ formatEgpWithUnit(line.price * line.qty) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Collapsible Coupon Code Field -->
    <div class="border-t border-border/60 pt-3">
      <button
        type="button"
        class="flex w-full items-center justify-between py-1 text-xs font-bold text-foreground transition-colors hover:text-serag-gold focus-visible:outline-none"
        @click="showCoupon = !showCoupon"
      >
        <span class="flex items-center gap-1.5">
          <Tag class="size-3.5 text-serag-gold" aria-hidden="true" />
          {{ t('store.checkout.couponPrompt') }}
        </span>
        <ChevronDown
          class="size-4 transition-transform duration-200"
          :class="showCoupon && 'rotate-180'"
          aria-hidden="true"
        />
      </button>

      <div v-if="showCoupon" class="mt-2.5 flex flex-col gap-2">
        <div class="flex gap-2">
          <input
            v-model="localCouponInput"
            type="text"
            :placeholder="t('store.checkout.couponPlaceholder')"
            :disabled="!hydrated || submitting"
            class="flex h-11 flex-1 rounded-xl border border-input bg-background px-3 text-xs uppercase placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
          <button
            type="button"
            :disabled="!hydrated || submitting || !localCouponInput.trim()"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="handleApplyCoupon"
          >
            {{ t('store.checkout.applyCoupon') }}
          </button>
        </div>

        <!-- Coupon Reason Notice -->
        <p
          v-if="quote?.coupon?.reason"
          class="text-xs font-medium text-amber-700 dark:text-amber-400"
        >
          {{ quote.coupon.reason }}
        </p>
      </div>
    </div>

    <!-- Deposit Notice (Large COD Orders) -->
    <div
      v-if="codDeposit?.required"
      class="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-900 dark:text-amber-300"
    >
      <AlertTriangle class="size-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p class="leading-relaxed">
        {{
          t('store.checkout.depositNotice', {
            threshold: formatEgpWithUnit(codDeposit.threshold),
            pct: codDeposit.pct,
            amount: formatEgpWithUnit(codDeposit.amount),
          })
        }}
      </p>
    </div>

    <!-- Totals Breakdown -->
    <div class="flex flex-col gap-2.5 border-t border-border/60 pt-4 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.subtotal') }}</span>
        <span class="num font-bold text-foreground">{{ formatEgpWithUnit(displaySubtotal) }}</span>
      </div>

      <div v-if="displayDiscount > 0" class="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
        <span>{{ t('store.cart.discount') }}</span>
        <span class="num font-bold">-{{ formatEgpWithUnit(displayDiscount) }}</span>
      </div>

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

      <div class="flex items-baseline justify-between">
        <span class="text-base font-bold text-foreground">{{ t('store.cart.total') }}</span>
        <span class="num text-xl font-extrabold text-serag-night dark:text-serag-gold">
          {{ formatEgpWithUnit(displayTotal) }}
        </span>
      </div>

      <p class="text-[11px] text-muted-foreground">
        {{ t('store.checkout.vatNotice') }}
      </p>
    </div>

    <!-- Desktop Place Order Button -->
    <div class="hidden md:flex flex-col gap-2 pt-2">
      <button
        type="button"
        :disabled="disabled || submitting || !hydrated"
        class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-serag-gold px-6 text-base font-bold text-serag-night shadow-md transition-all hover:bg-serag-gold-hi disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="emit('submit')"
      >
        <ShieldCheck class="size-5" aria-hidden="true" />
        <span>{{ submitting ? t('store.checkout.placingOrder') : t('store.checkout.placeOrder') }}</span>
      </button>

      <p
        v-if="hint"
        class="text-center text-xs font-semibold text-muted-foreground"
      >
        {{ hint }}
      </p>
    </div>
  </div>
</template>
