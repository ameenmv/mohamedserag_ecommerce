<script setup lang="ts">
import { ChevronRight, MessageCircle, Package, PackageSearch, ShoppingCart } from '@lucide/vue'
import type { CategoryTreeNode, ProductCard, SearchResponse } from '@serag/shared'
import { waLink } from '@serag/shared'

const props = defineProps<{
  query: string
  results: SearchResponse | null
  pending: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const storeApi = useStoreApi()
const settings = useStoreSettings()
const { add: addToCart } = useCart()

const topCategories = ref<CategoryTreeNode[]>([])
const categoriesFetched = ref(false)

async function fetchTopCategories(): Promise<void> {
  if (categoriesFetched.value) return
  try {
    const list = await storeApi.categories()
    topCategories.value = (list ?? []).filter((c) => c.productCount > 0).slice(0, 6)
    categoriesFetched.value = true
  } catch {
    // Keep empty if network fails
  }
}

watch(
  () => props.results,
  (res) => {
    if (res && res.items.length === 0 && res.categories.length === 0) {
      void fetchTopCategories()
    }
  },
  { immediate: true },
)

const whatsappPrefill = computed(() => {
  return `${t('store.listing.empty.whatsappPrefill')} ("${props.query}")`
})

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, whatsappPrefill.value) : '',
)

function handleAddToCart(item: ProductCard): void {
  addToCart(item, 1)
}

const liveAnnouncement = computed(() => {
  if (props.pending) {
    return t('store.listing.loading')
  }
  if (!props.results) {
    return ''
  }
  if (props.results.items.length > 0) {
    return t('store.header.resultsCount', { count: props.results.items.length })
  }
  return t('store.listing.empty.noSearchResults', { query: props.query })
})
</script>

<template>
  <div class="mt-4">
    <!-- Accessible announcement for screen readers -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ liveAnnouncement }}
    </div>

    <!-- Loading Skeleton Rows -->
    <div v-if="pending" class="space-y-2.5" aria-busy="true">
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
      >
        <Skeleton class="size-12 shrink-0 rounded-xl" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-3/4 rounded-md" />
          <Skeleton class="h-3 w-1/3 rounded-md" />
        </div>
        <Skeleton class="h-10 w-24 shrink-0 rounded-xl" />
      </div>
    </div>

    <!-- Loaded Results -->
    <div v-else-if="results" class="space-y-4">
      <!-- Category Suggestion Chips -->
      <div
        v-if="results.categories.length > 0"
        class="flex flex-wrap items-center gap-2 pt-1"
      >
        <span class="text-xs font-bold text-muted-foreground">
          {{ t('store.header.suggestedCategories') }}:
        </span>
        <NuxtLink
          v-for="cat in results.categories"
          :key="cat.slug"
          :to="localePath(`/c/${cat.slug}`)"
          class="inline-flex min-h-8 items-center rounded-full border border-border bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:border-serag-gold hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="emit('close')"
        >
          {{ cat.name }}
        </NuxtLink>
      </div>

      <!-- Up to 6 Product Rows -->
      <div
        v-if="results.items.length > 0"
        class="divide-y divide-border rounded-2xl border border-border bg-card shadow-xs"
      >
        <div
          v-for="item in results.items"
          :key="item.id"
          class="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/40"
        >
          <!-- Product Link (Thumbnail, Brand, Name, Price) -->
          <NuxtLink
            :to="localePath(`/p/${item.slug}`)"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="emit('close')"
          >
            <NuxtImg
              v-if="item.image?.url"
              :src="item.image.url"
              :alt="item.image.alt || item.name"
              width="48"
              height="48"
              class="size-12 shrink-0 rounded-xl border border-border/80 bg-serag-ivory/60 object-contain p-1 dark:bg-muted/30"
            />
            <div
              v-else
              class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-serag-ivory/60 text-muted-foreground/40 dark:bg-muted/30"
              aria-hidden="true"
            >
              <Package class="size-6 stroke-[1.2]" />
            </div>

            <div class="min-w-0 flex-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-serag-gold">
                {{ item.brand.name }}
              </span>
              <p class="truncate text-xs font-bold text-foreground sm:text-sm">
                {{ item.name }}
              </p>
              <StoreProductPrice
                :price="item.price"
                :old-price="item.oldPrice"
                :discount-percent="item.discountPercent"
                :flash="item.flash"
              />
            </div>
          </NuxtLink>

          <!-- Separate Add to Cart Action -->
          <div class="shrink-0">
            <button
              v-if="item.availability.orderable"
              type="button"
              class="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-serag-night px-3 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night"
              :aria-label="t('store.productPage.stickyBar.addToCartAria', { name: item.name })"
              @click="handleAddToCart(item)"
            >
              <ShoppingCart class="size-4 shrink-0 text-serag-gold-hi" aria-hidden="true" />
              <span class="hidden sm:inline">{{ t('store.product.addToCart') }}</span>
            </button>
            <span
              v-else
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-muted/70 px-3 text-xs font-bold text-muted-foreground"
            >
              {{ t('store.product.outOfStock') }}
            </span>
          </div>
        </div>
      </div>

      <!-- "See all results" Link -->
      <div v-if="results.items.length > 0" class="text-center pt-1">
        <NuxtLink
          :to="localePath({ path: '/shop', query: { q: query } })"
          class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
          @click="emit('close')"
        >
          <span>{{ t('store.header.seeAllResults', { query }) }}</span>
          <ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <!-- No Results State -->
      <div
        v-if="results.items.length === 0 && results.categories.length === 0"
        class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 px-6 py-8 text-center"
      >
        <div
          class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"
          aria-hidden="true"
        >
          <PackageSearch class="size-6 stroke-[1.5]" />
        </div>

        <p class="font-display text-xl text-foreground">
          {{ t('store.listing.empty.noSearchResults', { query }) }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ t('store.listing.empty.tryDifferentSearch') }}
        </p>

        <!-- Top Categories Fallback -->
        <div v-if="topCategories.length > 0" class="mt-4 flex flex-col items-center gap-2">
          <span class="text-xs font-bold text-muted-foreground">
            {{ t('store.listing.empty.topCategories') }}
          </span>
          <div class="flex flex-wrap justify-center gap-1.5">
            <NuxtLink
              v-for="cat in topCategories"
              :key="cat.id"
              :to="localePath(`/c/${cat.slug}`)"
              class="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              @click="emit('close')"
            >
              {{ cat.name }}
            </NuxtLink>
          </div>
        </div>

        <!-- WhatsApp Link -->
        <div v-if="whatsappUrl" class="mt-5">
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-emerald-400"
            @click="emit('close')"
          >
            <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('store.header.askOnWhatsapp') }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
