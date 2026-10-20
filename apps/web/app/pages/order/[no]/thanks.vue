<script setup lang="ts">
import { CheckCircle2, Copy, Check, PhoneCall, Home, ShoppingBag, MessageCircle, ShieldCheck } from '@lucide/vue'
import { waLink, type OrderThanks } from '@serag/shared'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const storeSettings = useStoreSettings()

const no = computed(() => String(route.params.no))
const token = computed(() => (typeof route.query.t === 'string' ? route.query.t : undefined))

const baseURL = getApiBaseUrl()
const { data: order, error } = await useAsyncData<OrderThanks | null>(
  `order-thanks-${no.value}`,
  async () => {
    if (!token.value) return null
    return $fetch<OrderThanks>(`/orders/${encodeURIComponent(no.value)}/thanks`, {
      baseURL,
      method: 'GET',
      query: { t: token.value },
    })
  },
)

const isSuccess = computed(() => Boolean(order.value && !error.value))
const isBridal = computed(() => order.value?.type === 'bridal')
const pageTitle = computed(() => (isBridal.value ? t('store.thanks.bridal.title') : t('store.thanks.pageTitle')))

useSeoMeta({
  title: () => pageTitle.value,
  robots: 'noindex, nofollow',
})

const bridalInstallmentsWhatsappUrl = computed(() => {
  if (!order.value || !storeSettings.whatsapp) return ''
  const text = t('store.thanks.bridal.installmentsInquiry', { no: order.value.no })
  return waLink(storeSettings.whatsapp, text)
})

const copiedOrderNo = ref(false)
async function copyOrderNo(): Promise<void> {
  if (!order.value?.no) return
  try {
    await navigator.clipboard.writeText(order.value.no)
    copiedOrderNo.value = true
    setTimeout(() => {
      copiedOrderNo.value = false
    }, 2000)
  } catch {
    // Clipboard API might be restricted
  }
}
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: pageTitle }]" />
      </div>
    </div>

    <!-- Invalid or Expired Token State -->
    <StoreThanksInvalid v-if="!isSuccess || !order" />

    <!-- Order Success View -->
    <div v-else class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12 flex flex-col gap-8">
      <!-- Success Header -->
      <div class="flex flex-col items-center text-center gap-4">
        <div class="flex size-18 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 class="size-10" aria-hidden="true" />
        </div>

        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {{ isBridal ? t('store.thanks.bridal.title') : t('store.thanks.orderReceived', { name: order.customerFirstName }) }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ isBridal ? t('store.thanks.bridal.subtitle') : t('store.thanks.summaryTitle') }}
          </p>
        </div>

        <!-- Order Number Badge & Copy Button -->
        <div class="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 py-2.5 shadow-2xs">
          <span class="text-xs font-semibold text-muted-foreground">
            {{ isBridal ? t('store.thanks.bridal.reservationNumber') : t('store.thanks.orderNumber') }}
          </span>
          <span class="num text-base font-extrabold text-serag-night dark:text-serag-gold">
            {{ order.no }}
          </span>
          <button
            type="button"
            class="ms-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.thanks.copyOrderNo')"
            @click="copyOrderNo"
          >
            <Check v-if="copiedOrderNo" class="size-4 text-emerald-600" aria-hidden="true" />
            <Copy v-else class="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Next Step Section -->
      <div class="flex flex-col gap-4">
        <!-- Bridal Lock Notice -->
        <div
          v-if="isBridal"
          class="flex flex-col gap-2 rounded-3xl border border-serag-gold/40 bg-serag-gold/10 p-5 sm:p-6"
        >
          <div class="flex items-center gap-2.5">
            <ShieldCheck class="size-5 text-serag-gold shrink-0" aria-hidden="true" />
            <h2 class="text-base font-bold text-foreground">
              {{ t('store.thanks.bridal.lockNotice', { lockDays: order.lockDays ?? 30 }) }}
            </h2>
          </div>
        </div>

        <!-- Next Step: COD Without Deposit -->
        <div
          v-if="!isBridal && order.paymentMethod === 'cod' && !order.deposit"
          class="flex items-start gap-3.5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 dark:bg-emerald-500/10"
        >
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PhoneCall class="size-5" aria-hidden="true" />
          </div>
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-bold text-foreground">
              {{ t('store.thanks.nextStepTitle') }}
            </h2>
            <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {{ t('store.thanks.codNextStep') }}
            </p>
          </div>
        </div>

        <!-- Next Step: Transfer OR Large COD with Deposit -->
        <StoreThanksTransfer
          v-else
          :no="order.no"
          :payment="order.payment"
          :deposit="order.deposit"
          :total="order.total"
          :confirm-token="order.confirmToken"
        />

        <!-- Bridal Installments Showroom Notice & WhatsApp Button -->
        <div
          v-if="isBridal"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs"
        >
          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-sm font-bold text-foreground">
              {{ t('store.thanks.bridal.installmentsTitle') }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ t('store.thanks.bridal.installmentsInquiry', { no: order.no }) }}
            </span>
          </div>
          <a
            v-if="bridalInstallmentsWhatsappUrl"
            :href="bridalInstallmentsWhatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white transition-colors hover:bg-[#20ba5a] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('store.thanks.bridal.installmentsButton') }}</span>
          </a>
        </div>
      </div>

      <!-- Ordered Items & Totals Breakdown -->
      <StoreThanksItems
        :items="order.items"
        :subtotal="order.subtotal"
        :discount="order.discount"
        :delivery-fee="order.deliveryFee"
        :total="order.total"
        :deposit="order.deposit"
        :payment-method-name="order.payment.name"
      />

      <!-- Action Navigation Links -->
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <NuxtLink
          :to="localePath('/')"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Home class="size-4" aria-hidden="true" />
          <span>{{ t('store.thanks.backToHome') }}</span>
        </NuxtLink>

        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ShoppingBag class="size-4" aria-hidden="true" />
          <span>{{ t('store.thanks.browseShop') }}</span>
        </NuxtLink>
      </div>
    </div>
  </main>
</template>
