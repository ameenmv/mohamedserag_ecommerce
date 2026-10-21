<script setup lang="ts">
import { Check, Sparkles } from '@lucide/vue'
import type { BridalTierSummary } from '@serag/shared'

const props = defineProps<{
  tier: BridalTierSummary
  pending?: boolean
  hydrated?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', tier: BridalTierSummary): void
}>()

const { t } = useI18n()
const { money } = usePrice()

const isPopular = computed(() => props.tier.slug === 'golden')
</script>

<template>
  <div
    :data-tier="tier.slug"
    :class="[
      'relative flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-sm transition-all sm:p-7',
      isPopular
        ? 'border-serag-gold ring-2 ring-serag-gold/20 shadow-md lg:-translate-y-2'
        : 'border-border/80 hover:border-border',
    ]"
  >
    <!-- Popular badge for golden tier -->
    <div
      v-if="isPopular"
      class="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2"
    >
      <span class="inline-flex items-center gap-1 rounded-full bg-serag-gold px-3.5 py-1 text-xs font-extrabold text-serag-night shadow-sm">
        <Sparkles class="size-3" aria-hidden="true" />
        {{ t('store.bridal.tiers.mostPopular') }}
      </span>
    </div>

    <div>
      <!-- Header -->
      <div class="mb-4 text-center">
        <h3 class="text-2xl font-black text-foreground">
          {{ tier.name }}
        </h3>
        <div class="mt-3 flex items-baseline justify-center gap-1">
          <span class="num text-3xl font-extrabold text-serag-night dark:text-serag-gold sm:text-4xl whitespace-nowrap">
            {{ money(tier.total) }}
          </span>
        </div>
        <div class="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{{ t('store.bridal.tiers.roomsCount', { count: tier.roomCount }) }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ t('store.bridal.tiers.itemsCount', { count: tier.itemCount }) }}</span>
        </div>
      </div>

      <!-- Highlights list -->
      <div class="my-6 border-t border-border/60 pt-5">
        <ul class="space-y-3">
          <li
            v-for="(highlight, idx) in tier.highlights"
            :key="idx"
            class="flex items-start gap-2.5 text-xs text-foreground/90 sm:text-sm"
          >
            <div class="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-serag-green/10 text-serag-green dark:bg-serag-gold/20 dark:text-serag-gold">
              <Check class="size-3 stroke-[3]" aria-hidden="true" />
            </div>
            <span>{{ highlight }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- CTA button -->
    <div class="mt-6 pt-2">
      <button
        type="button"
        :data-start-tier="tier.slug"
        :disabled="pending || !hydrated"
        :class="[
          'inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isPopular
            ? 'bg-serag-gold text-serag-night hover:bg-serag-gold-hi shadow-sm'
            : 'bg-serag-night text-serag-ivory hover:bg-serag-green dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi',
        ]"
        @click="emit('select', tier)"
      >
        <span>{{ pending ? t('store.bridal.tiers.starting') : t('store.bridal.tiers.startWithTier') }}</span>
      </button>
    </div>
  </div>
</template>
