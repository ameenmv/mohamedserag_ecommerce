<script setup lang="ts">
import { ShieldCheck, RefreshCw, AlertCircle } from '@lucide/vue'
import { formatEgpWithUnit } from '@serag/shared'

const { t } = useI18n()
const { lines, subtotal } = useCart()
const {
  form,
  errors,
  submitting,
  hydrated,
  canPlaceOrder,
  placeOrderHint,
  displayTotal,
  quote,
  governorates,
  citySuggestions,
  paymentMethods,
  settingsPending,
  settingsError,
  refreshSettings,
  refreshQuote,
  placeOrder,
  trackCheckoutStart,
} = useCheckout()

useSeoMeta({
  title: () => t('store.checkout.pageTitle'),
  robots: 'noindex, follow',
})

if (import.meta.client) {
  onMounted(() => {
    trackCheckoutStart()
  })
}
</script>

<template>
  <main class="w-full min-w-0 pb-32 md:pb-12">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb
          :items="[
            { label: t('store.cart.title'), to: '/cart' },
            { label: t('store.checkout.title') },
          ]"
        />
      </div>
    </div>

    <!-- Page Content -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
      <h1 class="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {{ t('store.checkout.title') }}
      </h1>

      <!-- Empty Cart State -->
      <StoreCartEmpty v-if="hydrated && lines.length === 0" />

      <!-- Settings Error State -->
      <div
        v-else-if="settingsError"
        class="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center"
      >
        <AlertCircle class="mx-auto mb-3 size-10 text-destructive" aria-hidden="true" />
        <p class="mb-4 text-sm font-semibold text-foreground">
          {{ t('store.checkout.settingsError') }}
        </p>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="refreshSettings()"
        >
          <RefreshCw class="size-4" aria-hidden="true" />
          <span>{{ t('store.checkout.retrySettings') }}</span>
        </button>
      </div>

      <!-- Settings Loading Skeleton -->
      <div
        v-else-if="settingsPending && governorates.length === 0"
        class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8"
      >
        <div class="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <div class="h-96 rounded-3xl bg-muted/40 animate-pulse" />
          <div class="h-48 rounded-3xl bg-muted/40 animate-pulse" />
        </div>
        <div class="lg:col-span-5 xl:col-span-4">
          <div class="h-80 rounded-3xl bg-muted/40 animate-pulse" />
        </div>
      </div>

      <!-- Checkout Form & Summary Grid -->
      <form
        v-else
        class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8"
        novalidate
        @submit.prevent="placeOrder"
      >
        <!-- Form Column (Desktop 7 cols, Mobile full) -->
        <div class="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <!-- Delivery Info -->
          <StoreCheckoutCustomerForm
            v-model="form"
            :errors="errors"
            :governorates="governorates"
            :city-suggestions="citySuggestions"
            :disabled="submitting"
            :hydrated="hydrated"
          />

          <!-- Payment Methods -->
          <StoreCheckoutPaymentMethods
            v-model="form.paymentMethod"
            :methods="paymentMethods"
            :disabled="submitting"
            :hydrated="hydrated"
          />
        </div>

        <!-- Summary Column (Desktop 5 cols, Mobile full) -->
        <div class="lg:col-span-5 xl:col-span-4">
          <StoreCheckoutSummary
            :lines="lines"
            :quote="quote"
            :subtotal="subtotal"
            :coupon-code="form.couponCode ?? ''"
            :submitting="submitting"
            :hydrated="hydrated"
            :disabled="!canPlaceOrder"
            :hint="placeOrderHint"
            @update:coupon-code="(c) => (form.couponCode = c)"
            @apply-coupon="refreshQuote"
            @submit="placeOrder"
          />
        </div>
      </form>
    </div>

    <!-- Sticky Mobile Bottom Bar -->
    <div
      v-if="lines.length > 0 && !settingsError"
      class="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-col gap-1.5 border-t border-border/80 bg-background/95 p-3.5 backdrop-blur-md md:hidden"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col min-w-0">
          <span class="text-[11px] font-semibold text-muted-foreground">{{ t('store.checkout.stickyTotal') }}</span>
          <span class="num text-lg font-extrabold text-serag-night dark:text-serag-gold truncate">
            {{ formatEgpWithUnit(displayTotal) }}
          </span>
        </div>

        <button
          type="button"
          :disabled="!canPlaceOrder || submitting || !hydrated"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-serag-gold px-5 text-sm font-bold text-serag-night shadow-sm transition-colors hover:bg-serag-gold-hi disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="placeOrder"
        >
          <ShieldCheck class="size-4.5" aria-hidden="true" />
          <span>{{ submitting ? t('store.checkout.placingOrder') : t('store.checkout.placeOrder') }}</span>
        </button>
      </div>

      <p
        v-if="placeOrderHint"
        class="text-center text-[11px] font-semibold text-muted-foreground"
      >
        {{ placeOrderHint }}
      </p>
    </div>
  </main>
</template>
