<script setup lang="ts">
import type { CatalogFacets, SpecTemplateField } from '@serag/shared'
import { useDebounceFn } from '@vueuse/core'
import {
  patchListingFilters,
  toApiQuery,
  type ListingFilters,
} from '~/utils/catalog-query'

const props = withDefaults(
  defineProps<{
    filters: ListingFilters
    facets?: CatalogFacets
    fields?: readonly SpecTemplateField[] | SpecTemplateField[]
    hideBrand?: boolean
    base?: { category?: string; brand?: string }
    initialTotal?: number
  }>(),
  {
    facets: undefined,
    fields: () => [],
    hideBrand: false,
    base: undefined,
    initialTotal: 0,
  },
)

const emit = defineEmits<{
  apply: [draft: ListingFilters]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const storeApi = useStoreApi()

const draft = ref<ListingFilters>(JSON.parse(JSON.stringify(props.filters)))
const liveTotal = ref<number | null>(props.initialTotal)
const isCounting = ref(false)

// Reset draft and total whenever the sheet opens
watch(open, (isOpen) => {
  if (isOpen) {
    draft.value = JSON.parse(JSON.stringify(props.filters))
    liveTotal.value = props.initialTotal
  }
})

const fetchLiveCount = useDebounceFn(async () => {
  try {
    isCounting.value = true
    const query = toApiQuery(draft.value, props.base)
    const res = await storeApi.products({ ...query, pageSize: 1 })
    liveTotal.value = res.total
  } catch {
    // Gracefully preserve current count preview
  } finally {
    isCounting.value = false
  }
}, 300)

function onDraftChange(patch: Partial<ListingFilters>) {
  draft.value = patchListingFilters(draft.value, patch)
  fetchLiveCount()
}

function onDraftClear() {
  draft.value = {
    brands: [],
    minPrice: undefined,
    maxPrice: undefined,
    availability: [],
    discounted: false,
    specs: {},
    sort: draft.value.sort,
    page: 1,
    q: draft.value.q,
  }
  fetchLiveCount()
}

function onApply() {
  emit('apply', draft.value)
  open.value = false
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="bottom"
      class="flex max-h-[85vh] flex-col rounded-t-3xl p-0 focus:outline-none"
    >
      <!-- Sheet Header -->
      <SheetHeader class="border-b border-border/80 px-5 py-4 text-start">
        <SheetTitle class="font-display text-xl text-foreground">
          {{ t('store.listing.filtersTitle') }}
        </SheetTitle>
      </SheetHeader>

      <!-- Scrollable Body with Filter Form -->
      <div class="flex-1 overflow-y-auto px-5 py-3">
        <StoreListingFilters
          :filters="draft"
          :facets="facets"
          :fields="fields"
          :hide-brand="hideBrand"
          @change="onDraftChange"
          @clear="onDraftClear"
        />
      </div>

      <!-- Sticky Footer with Clear and Live Count Apply Button -->
      <div
        class="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border/80 bg-background/95 px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur-md"
      >
        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
          @click="onDraftClear"
        >
          {{ t('store.listing.clearAll') }}
        </button>

        <button
          type="button"
          class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
          @click="onApply"
        >
          <span v-if="liveTotal !== null">
            {{ t('store.listing.applyFilters', { count: liveTotal.toLocaleString() }) }}
          </span>
          <span v-else>
            {{ t('store.listing.filters') }}
          </span>
        </button>
      </div>
    </SheetContent>
  </Sheet>
</template>
