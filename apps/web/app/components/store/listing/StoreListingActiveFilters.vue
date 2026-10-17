<script setup lang="ts">
import { RotateCcw, X } from '@lucide/vue'
import type { ActiveFilterChip } from '~/composables/useListing'

defineProps<{
  chips: readonly ActiveFilterChip[] | ActiveFilterChip[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="chips.length > 0"
    class="mb-4 flex flex-wrap items-center gap-2"
    :aria-label="t('store.listing.activeFilters')"
  >
    <span class="text-xs font-bold text-muted-foreground">
      {{ t('store.listing.activeFilters') }}:
    </span>

    <span
      v-for="chip in chips"
      :key="chip.id"
      class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-border/80"
    >
      <span>{{ chip.label }}</span>
      <button
        type="button"
        :aria-label="t('store.listing.removeFilter', { filter: chip.label })"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="chip.remove"
      >
        <X class="size-3" aria-hidden="true" />
      </button>
    </span>

    <button
      type="button"
      class="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-serag-gold hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      @click="emit('clear')"
    >
      <RotateCcw class="size-3" aria-hidden="true" />
      <span>{{ t('store.listing.clearAll') }}</span>
    </button>
  </div>
</template>
