<script setup lang="ts">
import { MessageCircle, PackageSearch, RotateCcw } from '@lucide/vue'
import { waLink } from '@serag/shared'

const props = defineProps<{
  q?: string
}>()

const emit = defineEmits<{
  clearFilters: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const storeApi = useStoreApi()
const settings = useStoreSettings()

// Fetch top categories for discovery when no results match
const { data: categoryTree } = await useAsyncData('listing:empty:categories', () =>
  storeApi.categories(),
)

const topCategories = computed(() => {
  return (categoryTree.value ?? [])
    .filter((c) => c.productCount > 0)
    .slice(0, 6)
})

const whatsappPrefill = computed(() => {
  return props.q
    ? `${t('store.listing.empty.whatsappPrefill')} ("${props.q}")`
    : t('store.listing.empty.whatsappPrefill')
})

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, whatsappPrefill.value) : '',
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center backdrop-blur-xs sm:py-16"
  >
    <div
      class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"
      aria-hidden="true"
    >
      <PackageSearch class="size-8 stroke-[1.5]" />
    </div>

    <!-- Empty state heading -->
    <h3 class="font-display text-2xl text-foreground sm:text-3xl">
      <span v-if="q">
        {{ t('store.listing.empty.noSearchResults', { query: q }) }}
      </span>
      <span v-else>
        {{ t('store.listing.empty.noFilteredProducts') }}
      </span>
    </h3>

    <!-- Helper explanation -->
    <p class="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
      <span v-if="q">
        {{ t('store.listing.empty.tryDifferentSearch') }}
      </span>
      <span v-else>
        {{ t('store.listing.empty.tryDifferentFilters') }}
      </span>
    </p>

    <!-- Clear filters CTA (shown when no q or filtered) -->
    <div v-if="!q" class="mt-5">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        @click="emit('clearFilters')"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        <span>{{ t('store.listing.clearFilters') }}</span>
      </button>
    </div>

    <!-- Popular top category pills -->
    <div v-if="topCategories.length > 0" class="mt-8 flex flex-col items-center gap-3">
      <span class="text-xs font-bold text-muted-foreground">
        {{ t('store.listing.empty.topCategories') }}
      </span>
      <div class="flex flex-wrap justify-center gap-2">
        <NuxtLink
          v-for="cat in topCategories"
          :key="cat.id"
          :to="localePath(`/c/${cat.slug}`)"
          class="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:border-serag-gold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          {{ cat.name }}
        </NuxtLink>
      </div>
    </div>

    <!-- Ask us on WhatsApp button -->
    <div v-if="whatsappUrl" class="mt-6">
      <a
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm dark:text-emerald-400 motion-reduce:transition-none"
      >
        <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.listing.empty.askOnWhatsapp') }}</span>
      </a>
    </div>
  </div>
</template>
