<script setup lang="ts">
import { ArrowLeftRight, Package, X } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import { stripLocalePrefix } from '~/utils/i18n'

const { entries, count, remove, clear } = useCompare()
const storeApi = useStoreApi()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const currentCards = ref<ProductCard[]>([])

const isCompareRoute = computed(() => {
  const p = stripLocalePrefix(route.path)
  return p === '/compare' || p === '/compare/'
})

const isProductRoute = computed(() => {
  const p = stripLocalePrefix(route.path)
  return p.startsWith('/p/')
})

const showBar = computed(() => {
  return count.value >= 1 && !isCompareRoute.value
})

watch(
  () => entries.value.map((e) => e.productId).join(','),
  async (idsStr) => {
    if (!idsStr) {
      currentCards.value = []
      return
    }
    try {
      const ids = entries.value.map((e) => e.productId)
      currentCards.value = await storeApi.productsByIds(ids)
    } catch {
      currentCards.value = []
    }
  },
  { immediate: true },
)
</script>

<template>
  <aside
    v-if="showBar"
    :aria-label="t('store.compare.barAria')"
    :class="[
      'fixed inset-x-0 z-30 border-t border-serag-gold/30 bg-background/95 p-2.5 shadow-xl backdrop-blur-md transition-all duration-200 sm:p-3',
      'bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:bottom-0 md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]',
      isProductRoute ? 'hidden lg:block' : 'block',
    ]"
  >
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <!-- Compare Items Thumbnails -->
      <div class="flex items-center gap-3 overflow-x-auto pt-2.5 pe-2.5 pb-1">
        <div
          v-for="card in currentCards"
          :key="card.id"
          class="relative flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-serag-ivory/60 p-1 dark:bg-muted/30"
        >
          <NuxtImg
            v-if="card.image?.url"
            :src="card.image.url"
            :alt="card.image.alt || card.name"
            width="44"
            height="44"
            class="size-full object-contain"
          />
          <div
            v-else
            class="flex size-full items-center justify-center text-muted-foreground/40"
            aria-hidden="true"
          >
            <Package class="size-5" />
          </div>

          <button
            type="button"
            class="absolute -top-2 -end-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs transition-colors hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.compare.removeAria', { name: card.name })"
            @click="remove(card.id)"
          >
            <X class="size-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :aria-label="t('store.compare.clearAria')"
          @click="clear"
        >
          {{ t('store.compare.clear') }}
        </button>

        <NuxtLink
          :to="count >= 2 ? localePath('/compare') : undefined"
          :aria-disabled="count < 2"
          :class="[
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
            count >= 2
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground opacity-60 pointer-events-none',
          ]"
        >
          <ArrowLeftRight class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ t('store.compare.compareButton', { count }) }}</span>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>
