<script setup lang="ts">
import StoreHeader from '@/components/store/StoreHeader.vue'
import type { ProductCard } from '@serag/shared'
import { stripLocalePrefix } from '~/utils/i18n'

const { t } = useI18n()
const route = useRoute()
const { count: compareCount } = useCompare()
const pendingCompare = useState<ProductCard | null>('compare-pending', () => null)
const hydrated = useHydrated()

useLocalBusinessJsonLd()

const showCompareBar = computed(() => {
  if (!hydrated.value || compareCount.value < 1) return false
  const path = stripLocalePrefix(route.path).replace(/\/$/, '')
  // Hidden where it would compete with the page's own sticky actions (checkout total, cart, thank-you, bridal).
  const hiddenOn = ['/compare', '/cart', '/checkout']
  return !hiddenOn.includes(path) && !path.startsWith('/order/') && !path.startsWith('/bridal')
})

const isProductRoute = computed(() => {
  const path = stripLocalePrefix(route.path)
  return path.startsWith('/p/')
})
</script>

<template>
  <div
    :class="[
      'flex min-h-dvh flex-col bg-background text-foreground',
      showCompareBar
        ? isProductRoute
          ? 'pb-20 lg:pb-24'
          : 'pb-36 md:pb-20 lg:pb-24'
        : 'pb-20 md:pb-0',
    ]"
  >
    <a
      href="#store-main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-bold focus:text-accent-foreground focus:shadow-lg"
    >
      {{ t('common.skipToContent') }}
    </a>

    <StoreHeader />

    <div id="store-main-content" tabindex="-1" class="flex-1 outline-none">
      <slot />
    </div>

    <!-- Client-only Floating Compare Bar, Replace Dialog, Cart Drawer & Quote Sync -->
    <ClientOnly>
      <LazyStoreCompareBar v-if="showCompareBar" />
      <LazyStoreCompareReplaceDialog v-if="pendingCompare" />
      <LazyStoreCartDrawer />
      <LazyStoreCartQuoteSync />
    </ClientOnly>

    <LazyStoreFooter hydrate-on-visible />
    <LazyStoreWhatsAppFloat hydrate-never />
    <LazyStoreBottomNav hydrate-on-idle />
  </div>
</template>
