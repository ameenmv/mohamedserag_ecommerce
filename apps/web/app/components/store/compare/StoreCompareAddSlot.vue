<script setup lang="ts">
import { Loader2, Plus, Search } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'

const props = defineProps<{
  categorySlug?: string
  categoryName?: string
}>()

const emit = defineEmits<{
  added: [product: ProductCard]
}>()

const { t } = useI18n()
const { money } = usePrice()
const storeApi = useStoreApi()
const compare = useCompare()
const notify = useNotify()
const pendingCompare = useState<ProductCard | null>('compare-pending', () => null)

const searchQuery = ref('')
const loading = ref(false)
const suggestions = ref<ProductCard[]>([])
const searchError = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let currentReq = 0

async function fetchSuggestions(q: string) {
  const trimmed = q.trim()
  loading.value = true
  searchError.value = false
  const reqId = ++currentReq

  try {
    const res = await storeApi.products({
      category: props.categorySlug || undefined,
      q: trimmed.length > 0 ? trimmed : undefined,
      pageSize: 4,
    })

    if (reqId === currentReq) {
      // Filter out products already present in compare list
      suggestions.value = res.items.filter((p) => !compare.has(p.id)).slice(0, 4)
    }
  } catch {
    if (reqId === currentReq) {
      searchError.value = true
      suggestions.value = []
    }
  } finally {
    if (reqId === currentReq) {
      loading.value = false
    }
  }
}

watch(
  searchQuery,
  (val) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      void fetchSuggestions(val)
    }, 250)
  },
  { immediate: false },
)

onMounted(() => {
  void fetchSuggestions('')
})

onScopeDispose(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

function handleSelect(product: ProductCard) {
  const result = compare.toggle(product)
  if (result === 'full') {
    pendingCompare.value = product
  } else if (result === 'added') {
    notify.success(t('store.compare.addedNotice'))
    emit('added', product)
  }
}
</script>

<template>
  <div
    class="flex min-h-[340px] flex-col rounded-2xl border-2 border-dashed border-serag-gold/40 bg-card/60 p-3.5 shadow-2xs backdrop-blur-sm transition-colors hover:border-serag-gold sm:p-4"
  >
    <!-- Slot Header -->
    <div class="mb-3 space-y-1 text-center">
      <div class="mx-auto flex size-9 items-center justify-center rounded-full bg-serag-gold/15 text-serag-gold-ink dark:text-serag-gold-hi">
        <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
      </div>
      <h3 class="text-xs font-bold text-foreground sm:text-sm">
        {{ t('store.compare.addSlotTitle') }}
      </h3>
      <p class="text-[11px] text-muted-foreground">
        {{ t('store.compare.addSlotSubtitle', { max: MAX_COMPARE_ITEMS }) }}
      </p>
    </div>

    <!-- Search Input Limited to Category -->
    <div class="relative mb-3">
      <label :for="`compare-add-slot-search-${categorySlug || 'all'}`" class="sr-only">
        {{ categoryName ? t('store.compare.searchInCategory', { category: categoryName }) : t('store.compare.searchPlaceholder') }}
      </label>
      <input
        :id="`compare-add-slot-search-${categorySlug || 'all'}`"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        :placeholder="categoryName ? t('store.compare.searchInCategory', { category: categoryName }) : t('store.compare.searchPlaceholder')"
        class="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-serag-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
      <Search
        v-if="!loading"
        class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Loader2
        v-else
        class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 animate-spin text-serag-gold"
        aria-hidden="true"
      />
    </div>

    <!-- Suggestions List (up to 4 products) -->
    <div class="flex-1 space-y-1.5 overflow-y-auto">
      <div v-if="loading && suggestions.length === 0" class="space-y-2 py-4 text-center">
        <Skeleton v-for="i in 3" :key="i" class="h-12 w-full rounded-xl" />
      </div>

      <div
        v-else-if="suggestions.length === 0"
        class="flex min-h-[140px] items-center justify-center p-3 text-center text-xs text-muted-foreground"
      >
        <span>{{ t('store.compare.noSuggestions') }}</span>
      </div>

      <button
        v-for="item in suggestions"
        :key="item.id"
        type="button"
        class="group flex w-full min-h-11 items-center gap-2.5 rounded-xl border border-transparent bg-background/60 p-2 text-start transition-all hover:border-serag-gold/50 hover:bg-background hover:shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        :aria-label="t('store.compare.addAria', { name: item.name })"
        @click="handleSelect(item)"
      >
        <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 p-1">
          <NuxtImg
            v-if="item.image?.url"
            :src="item.image.url"
            :alt="item.image.alt || item.name"
            width="40"
            height="40"
            class="size-full object-contain"
          />
        </div>

        <div class="min-w-0 flex-1">
          <span class="block truncate text-[10px] font-bold uppercase tracking-wider text-serag-gold-ink dark:text-serag-gold-hi">
            {{ item.brand.name }}
          </span>
          <p class="truncate text-xs font-bold text-foreground">
            {{ item.name }}
          </p>
          <span class="num text-[11px] font-bold text-serag-gold-ink dark:text-serag-gold-hi">
            {{ money(item.price) }}
          </span>
        </div>

        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-serag-gold/15 text-serag-gold-ink transition-colors group-hover:bg-serag-gold group-hover:text-serag-night dark:text-serag-gold-hi"
          aria-hidden="true"
        >
          <Plus class="size-3.5 stroke-[2.5]" />
        </span>
      </button>
    </div>
  </div>
</template>
