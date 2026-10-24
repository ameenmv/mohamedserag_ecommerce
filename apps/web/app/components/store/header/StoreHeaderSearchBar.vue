<script setup lang="ts">
import { Search } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'

const { t } = useI18n()
const localePath = useLocalePath()

const query = ref('')
const focused = ref(false)
const root = ref<HTMLElement | null>(null)
const { results, pending, error } = useLiveSearch(query)

const showResults = computed(() => focused.value && query.value.trim().length >= 2)

onClickOutside(root, () => {
  focused.value = false
})

function submit(): void {
  focused.value = false
  const q = query.value.trim()
  navigateTo({ path: localePath('/shop'), query: q ? { q } : undefined })
}
</script>

<template>
  <!-- A real GET form: without JavaScript it still lands on /shop?q=… -->
  <form
    ref="root"
    role="search"
    :action="localePath('/shop')"
    method="get"
    class="relative flex min-w-0 items-center gap-2.5 rounded-full border-[1.5px] border-[#E4DDC6] bg-serag-cream py-1.5 ps-2 pe-1.5 focus-within:border-serag-gold"
    @submit.prevent="submit"
    @keydown.esc="focused = false"
  >
    <label for="store-header-search" class="sr-only">{{ t('store.header.searchProduct') }}</label>
    <input
      id="store-header-search"
      v-model="query"
      name="q"
      type="search"
      autocomplete="off"
      :placeholder="t('store.header.searchPlaceholder')"
      class="min-w-0 flex-1 bg-transparent px-4 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
      @focus="focused = true"
      @input="focused = true"
    >
    <button
      type="submit"
      :aria-label="t('common.search')"
      class="flex size-11 flex-none items-center justify-center rounded-full bg-serag-green text-[#E8DFB0] transition-colors hover:bg-serag-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Search class="size-5" aria-hidden="true" />
    </button>

    <div
      v-if="showResults"
      id="store-header-search-results"
      role="region"
      :aria-label="t('store.header.searchTitle')"
      class="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-xl"
    >
      <LazyStoreHeaderSearchResults
        :query="query.trim()"
        :results="results"
        :pending="pending"
        :error="error"
        @close="focused = false"
      />
    </div>
  </form>
</template>
