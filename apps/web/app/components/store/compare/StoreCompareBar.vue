<script setup lang="ts">
import { ArrowLeftRight, Package, X } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'
import { stripLocalePrefix } from '~/utils/i18n'

const { entries, count, remove, clear } = useCompare()
const storeApi = useStoreApi()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const currentCards = ref<ProductCard[]>([])
const emptySlots = computed(() => Math.max(0, MAX_COMPARE_ITEMS - count.value))

const isCompareRoute = computed(() => {
  const p = stripLocalePrefix(route.path)
  return p === '/compare' || p === '/compare/'
})

const isProductRoute = computed(() => stripLocalePrefix(route.path).startsWith('/p/'))

const showBar = computed(() => count.value >= 1 && !isCompareRoute.value)

watch(
  () => entries.value.map((e) => e.productId).join(','),
  async (idsStr) => {
    if (!idsStr) {
      currentCards.value = []
      return
    }
    try {
      currentCards.value = await storeApi.productsByIds(entries.value.map((e) => e.productId))
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
      'pointer-events-none fixed inset-x-0 z-30 justify-center px-3',
      'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-5',
      isProductRoute ? 'hidden lg:flex' : 'flex',
    ]"
  >
    <div
      class="compare-pill pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-serag-night py-1.5 ps-2 pe-1.5 text-serag-ivory shadow-2xl"
      aria-live="polite"
    >
      <!-- Chosen products + the free slots -->
      <ul class="flex items-center gap-1.5">
        <li v-for="card in currentCards" :key="card.id" class="group relative">
          <div class="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-2 ring-serag-gold/70">
            <NuxtImg
              v-if="card.image?.url"
              :src="card.image.url"
              :alt="card.image.alt || card.name"
              width="40"
              height="40"
              class="size-full object-contain"
            />
            <Package v-else class="size-4 text-serag-night/40" aria-hidden="true" />
          </div>
          <button
            type="button"
            class="absolute -top-1 -end-1 flex size-[18px] items-center justify-center rounded-full bg-serag-ivory text-serag-night shadow-sm transition-colors hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
            :aria-label="t('store.compare.removeAria', { name: card.name })"
            @click="remove(card.id)"
          >
            <X class="size-3" aria-hidden="true" />
          </button>
        </li>
        <li
          v-for="n in emptySlots"
          :key="`slot-${n}`"
          class="size-10 rounded-full border border-dashed border-white/30"
          aria-hidden="true"
        />
      </ul>

      <p class="hidden px-1 text-xs font-semibold text-serag-ivory/75 sm:block">
        {{ count < 2 ? t('store.compare.barHint') : t('store.compare.barReady', { count }) }}
      </p>

      <NuxtLink
        :to="count >= 2 ? localePath('/compare') : undefined"
        :aria-disabled="count < 2"
        :class="[
          'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:text-sm',
          count >= 2
            ? 'bg-serag-gold text-serag-night hover:bg-serag-gold-hi'
            : 'pointer-events-none bg-white/10 text-serag-ivory/50',
        ]"
      >
        <ArrowLeftRight class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.compare.compareButton', { count }) }}</span>
      </NuxtLink>

      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-full text-serag-ivory/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        :aria-label="t('store.compare.clearAria')"
        @click="clear"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>
