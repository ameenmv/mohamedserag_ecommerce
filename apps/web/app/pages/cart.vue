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

      <!-- Empty State -->
      <StoreCartEmpty v-if="isMounted && lines.length === 0" />

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
        <div class="lg:col-span-5 xl:col-span-4">
          <StoreCartTotals
            :quote="quote"
            :subtotal="subtotal"
            :has-blocking-issues="hasBlockingIssues"
            :disabled="lines.length === 0"
            @checkout="handleCheckout"
          />
        </div>
      </div>
    </div>
  </main>
</template>
