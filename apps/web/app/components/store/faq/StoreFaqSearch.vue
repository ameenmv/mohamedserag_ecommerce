<script setup lang="ts">
import { Search, X } from '@lucide/vue'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [query: string]
}>()

const { t } = useI18n()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function clear(): void {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative mx-auto w-full max-w-2xl">
    <label for="faq-search-input" class="sr-only">
      {{ t('store.faq.searchLabel') }}
    </label>

    <div class="relative flex items-center">
      <Search
        class="pointer-events-none absolute start-4 size-5 text-muted-foreground"
        aria-hidden="true"
      />

      <input
        id="faq-search-input"
        :value="modelValue"
        type="search"
        autocomplete="off"
        :placeholder="t('store.faq.searchPlaceholder')"
        class="h-12 w-full rounded-2xl border border-border bg-card ps-12 pe-12 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-14 sm:text-base"
        @input="onInput"
      >

      <button
        v-if="modelValue"
        type="button"
        :aria-label="t('store.faq.clearSearch')"
        class="absolute end-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="clear"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
