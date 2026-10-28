<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { lines, subtotal, setQty, remove } = useCart()
const { quote, priceChanges, dismissPriceChange, fetchQuote } = useCartQuote()

useSeoMeta({
  title: () => t('store.cart.pageTitle'),
  robots: 'noindex, follow',
})

const isMounted = ref(false)
if (import.meta.client) {
  onMounted(async () => {
    isMounted.value = true
    await fetchQuote()
  })
}

const hasBlockingIssues = computed(() => quote.value?.hasBlockingIssues ?? false)

function handleCheckout(): void {
  navigateTo(localePath('/checkout'))
}
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.cart.title') }]" />
      </div>
    </div>

    <!-- Page Content -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
      <h1 class="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {{ t('store.cart.title') }}
      </h1>

      <!-- The cart lives in browser storage: skeleton until it is read -->
      <div v-if="!isMounted" class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8" aria-busy="true">
        <div class="flex flex-col gap-3 lg:col-span-7 xl:col-span-8">
          <div v-for="i in 2" :key="i" class="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <Skeleton class="size-18 shrink-0 rounded-xl sm:size-20" />
            <div class="flex flex-1 flex-col gap-2">
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-3 w-1/3" />
              <Skeleton class="mt-1 h-10 w-28 rounded-full" />
            </div>
            <Skeleton class="h-5 w-16" />
          </div>
        </div>
        <div class="rounded-[28px] border border-border bg-card p-5 lg:col-span-5 xl:col-span-4">
          <Skeleton class="h-5 w-28" />
          <Skeleton class="mt-5 h-4 w-full" />
          <Skeleton class="mt-3 h-4 w-full" />
          <Skeleton class="mt-6 h-7 w-1/2" />
          <Skeleton class="mt-6 h-12 w-full rounded-2xl" />
        </div>
      </div>

      <!-- Empty State -->
      <StoreCartEmpty v-else-if="lines.length === 0" />

      <!-- Cart Content Grid -->
      <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <!-- Lines List (Desktop 7 cols, Mobile full) -->
        <div class="flex flex-col gap-3 lg:col-span-7 xl:col-span-8">
          <StoreCartLine
            v-for="line in lines"
            :key="line.productId"
            :line="line"
            :quote-line="quote?.lines.find((ql) => ql.productId === line.productId)"
            :price-change="priceChanges[line.productId]"
            @update:qty="(q) => setQty(line.productId, q)"
            @remove="remove(line.productId)"
            @dismiss-price-change="dismissPriceChange(line.productId)"
          />
        </div>

        <!-- Totals & Summary (Desktop 5 cols, Mobile full) -->
        <div class="flex flex-col gap-4 lg:sticky lg:top-28 lg:col-span-5 xl:col-span-4">
          <StoreCartTotals
            :quote="quote"
            :subtotal="subtotal"
            :has-blocking-issues="hasBlockingIssues"
            :disabled="lines.length === 0"
            @checkout="handleCheckout"
          />
          <StoreTrustRow class="rounded-[28px] border border-border bg-card p-4" />
        </div>
      </div>
    </div>
  </main>
</template>
