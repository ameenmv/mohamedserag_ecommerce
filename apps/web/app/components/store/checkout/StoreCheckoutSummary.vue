<script setup lang="ts">
import { AlertTriangle, ChevronDown, Package, ShieldCheck, Tag, X } from '@lucide/vue'
import type { CartQuote } from '@serag/shared'
import type { CartLine } from '~/utils/cart'

const props = withDefaults(
  defineProps<{
    lines: CartLine[]
    quote: CartQuote | null
    subtotal: number
    couponCode: string
    submitting: boolean
    hydrated: boolean
    disabled?: boolean
    hint?: string | null
    quotePending?: boolean
  }>(),
  {
    disabled: false,
    hint: null,
    quotePending: false,
  },
)

const emit = defineEmits<{
  'update:couponCode': [code: string]
  'apply-coupon': []
  'remove-coupon': []
  submit: []
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

const showCoupon = ref(false)
const localCouponInput = ref(props.couponCode)

// Auto-expand the coupon panel if a code is present or a coupon evaluation exists
watch(
  () => [props.couponCode, props.quote?.coupon],
  ([code, coupon]) => {
    if (Boolean(code && String(code).trim().length > 0) || Boolean(coupon)) {
      showCoupon.value = true
    }
  },
  { immediate: true },
)

// Keep localCouponInput in sync when the couponCode prop changes
watch(
  () => props.couponCode,
  (newCode) => {
    localCouponInput.value = newCode ?? ''
  },
)

const displaySubtotal = computed(() => props.quote?.subtotal ?? props.subtotal)
const displayDiscount = computed(() => props.quote?.discount ?? 0)
const displayTotal = computed(() => props.quote?.total ?? props.subtotal)
const deliveryFee = computed(() => props.quote?.deliveryFee ?? 0)
const hasZone = computed(() => Boolean(props.quote?.zone))

const codDeposit = computed(() => props.quote?.codDeposit)

const isCouponApplied = computed(() => props.quote?.coupon?.status === 'applied')
const isCouponRejected = computed(() => props.quote?.coupon?.status === 'rejected')

const couponReasonText = computed<string | null>(() => {
  const coupon = props.quote?.coupon
  if (!coupon || coupon.status !== 'rejected') {
    return null
  }
  const key = couponReasonKey(coupon.reasonCode)
  const amount = coupon.minOrder ? money(coupon.minOrder) : ''
  return t(key, { amount })
})

function handleApplyCoupon(): void {
  const trimmed = localCouponInput.value.trim()
  if (!trimmed || !props.hydrated || props.submitting || props.quotePending) {
    return
  }
  emit('update:couponCode', trimmed)
  emit('apply-coupon')
}

function handleRemoveCoupon(): void {
  localCouponInput.value = ''
  emit('remove-coupon')
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
            :aria-label="line.name"
            class="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-serag-cream"
          >
            <img
              v-if="line.image"
              :src="line.image"
              :alt="line.name"
              class="size-full object-contain p-0.5"
              loading="lazy"
            >
            <div v-else class="flex size-full items-center justify-center bg-serag-cream text-serag-green" aria-hidden="true">
          <Package class="size-5" stroke-width="1.4" />
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
            {{ money(line.price * line.qty) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Collapsible Coupon Code Field -->
    <div class="border-t border-border/60 pt-3">
      <button
        id="coupon-toggle-btn"
        type="button"
        :aria-expanded="showCoupon"
        aria-controls="coupon-panel"
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

      <div
        v-if="showCoupon"
        id="coupon-panel"
        role="region"
        aria-labelledby="coupon-toggle-btn"
        class="mt-2.5 flex flex-col gap-2"
      >
        <!-- Applied State Chip -->
        <div
          v-if="isCouponApplied && quote?.coupon"
          class="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Tag class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-200 break-all">
                {{ t('store.checkout.coupon.applied', { code: quote.coupon.code }) }}
              </span>
              <span class="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {{ t('store.checkout.coupon.saving', { amount: money(quote.coupon.discount) }) }}
              </span>
            </div>
          </div>

          <button
            type="button"
            :disabled="!hydrated || submitting || quotePending"
            :aria-label="t('store.checkout.coupon.removeAria', { code: quote.coupon.code })"
            class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="handleRemoveCoupon"
          >
            <X class="size-3.5" aria-hidden="true" />
            <span>{{ t('store.checkout.coupon.remove') }}</span>
          </button>
        </div>

        <!-- Input Row (Shown when no code applied or refused) -->
        <div v-else class="flex flex-col gap-2">
          <div class="flex gap-2">
            <label for="checkout-coupon" class="sr-only">
              {{ t('store.checkout.couponCode') }}
            </label>
            <input
              id="checkout-coupon"
              v-model="localCouponInput"
              type="text"
              autocomplete="off"
              :placeholder="t('store.checkout.couponPlaceholder')"
              :disabled="!hydrated || submitting"
              :aria-invalid="isCouponRejected"
              :aria-describedby="isCouponRejected ? 'coupon-error-msg' : undefined"
              class="flex h-11 flex-1 rounded-xl border border-input bg-background px-3 text-xs uppercase placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @keydown.enter.prevent="handleApplyCoupon"
            >
            <button
              type="button"
              :disabled="!hydrated || submitting || quotePending || !localCouponInput.trim()"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              @click="handleApplyCoupon"
            >
              {{ t('store.checkout.applyCoupon') }}
            </button>
          </div>

          <!-- Localized Refusal Reason Notice -->
          <p
            v-if="isCouponRejected && couponReasonText"
            id="coupon-error-msg"
            role="status"
            aria-live="polite"
            class="text-xs font-medium text-amber-700 dark:text-amber-400"
          >
            {{ couponReasonText }}
          </p>
        </div>
      </div>
    </div>

    <!-- Deposit Notice (Large COD Orders) -->
    <div
      v-if="codDeposit?.required"
      class="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-900 dark:text-amber-300"
    >
      <AlertTriangle class="size-4.5 shrink-0 mt-0.5 text-amber-800 dark:text-amber-400" aria-hidden="true" />
      <p class="leading-relaxed">
        {{
          t('store.checkout.depositNotice', {
            threshold: money(codDeposit.threshold),
            pct: codDeposit.pct,
            amount: money(codDeposit.amount),
          })
        }}
      </p>
    </div>

    <!-- Totals Breakdown -->
    <div class="flex flex-col gap-2.5 border-t border-border/60 pt-4 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.subtotal') }}</span>
        <span class="num font-bold text-foreground">{{ money(displaySubtotal) }}</span>
      </div>

      <div v-if="displayDiscount > 0" class="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
        <span>{{ t('store.cart.discount') }}</span>
        <span class="num font-bold">-{{ money(displayDiscount) }}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">{{ t('store.cart.deliveryFee') }}</span>
        <span v-if="hasZone" class="num font-bold text-foreground">
          {{ money(deliveryFee) }}
        </span>
        <span v-else class="text-xs text-muted-foreground">
          {{ t('store.cart.deliveryFeeNextStep') }}
        </span>
      </div>

      <div class="my-1 border-t border-border/60" />

      <div class="flex items-baseline justify-between">
        <span class="text-base font-bold text-foreground">{{ t('store.cart.total') }}</span>
        <span class="num text-xl font-extrabold text-serag-night dark:text-serag-gold">
          {{ money(displayTotal) }}
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
