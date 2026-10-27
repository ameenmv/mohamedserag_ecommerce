<script setup lang="ts">
import { ArrowUpRight, RotateCcw } from '@lucide/vue'

defineProps<{
  q?: string
  /** The products could not be loaded at all (not "no match") */
  failed?: boolean
}>()

const emit = defineEmits<{
  clearFilters: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const tips = computed(() => [
  t('store.listing.empty.tipWiden'),
  t('store.listing.empty.tipRemove'),
])

function retry(): void {
  reloadNuxtApp({ persistState: false })
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-[28px] border border-border bg-card px-5 py-12 text-center sm:px-10 sm:py-16"
    role="status"
  >
    <!-- Soft brand glow behind the illustration -->
    <div
      class="pointer-events-none absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-serag-gold/15 blur-3xl rtl:translate-x-1/2"
      aria-hidden="true"
    />

    <div class="relative mx-auto mb-6 size-36 sm:size-40" aria-hidden="true">
      <svg viewBox="0 0 160 160" fill="none" class="size-full text-primary">
        <circle cx="80" cy="80" r="74" class="stroke-border" stroke-width="1.5" stroke-dasharray="3 7" stroke-linecap="round" />
        <circle cx="80" cy="80" r="54" class="fill-secondary" />
        <!-- open box -->
        <g class="animate-floaty">
          <path d="M44 74 80 58l36 16v38L80 128l-36-16V74Z" class="fill-card stroke-current" stroke-width="3" stroke-linejoin="round" />
          <path d="M44 74 80 90l36-16M80 90v38" class="stroke-current" stroke-width="3" stroke-linejoin="round" />
          <path d="m62 66 36 16" class="stroke-serag-gold" stroke-width="3" stroke-linecap="round" />
        </g>
        <!-- magnifier -->
        <g class="stroke-serag-gold" stroke-width="5" stroke-linecap="round">
          <circle cx="112" cy="48" r="16" class="fill-card" />
          <path d="m124 60 12 12" />
          <path d="M106 48h12" stroke-width="3.5" />
        </g>
      </svg>
    </div>

    <h3 class="font-display relative text-2xl text-foreground sm:text-3xl">
      <template v-if="failed">{{ t('store.listing.empty.failedTitle') }}</template>
      <template v-else-if="q">{{ t('store.listing.empty.noSearchResults', { query: q }) }}</template>
      <template v-else>{{ t('store.listing.empty.noFilteredProducts') }}</template>
    </h3>

    <p class="relative mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
      <template v-if="failed">{{ t('store.listing.empty.failedDescription') }}</template>
      <template v-else-if="q">{{ t('store.listing.empty.tryDifferentSearch') }}</template>
      <template v-else>{{ t('store.listing.empty.tryDifferentFilters') }}</template>
    </p>

    <!-- Tips -->
    <ul v-if="!failed" class="relative mt-5 flex flex-wrap justify-center gap-2" :aria-label="t('store.listing.empty.tipsTitle')">
      <li
        v-for="tip in tips"
        :key="tip"
        class="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
      >
        {{ tip }}
      </li>
    </ul>

    <!-- Actions -->
    <div class="relative mt-7 flex flex-wrap items-center justify-center gap-3">
      <button
        v-if="failed"
        type="button"
        class="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        @click="retry"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        {{ t('store.listing.empty.retry') }}
      </button>
      <button
        v-if="!q"
        type="button"
        class="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        :class="failed ? 'border border-border bg-card text-foreground hover:bg-secondary' : 'bg-primary text-primary-foreground hover:bg-primary/90'"
        @click="emit('clearFilters')"
      >
        <RotateCcw v-if="!failed" class="size-4" aria-hidden="true" />
        {{ t('store.listing.clearFilters') }}
      </button>
      <NuxtLink
        :to="localePath('/shop')"
        class="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        {{ t('store.listing.empty.browseAll') }}
        <ArrowUpRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>
