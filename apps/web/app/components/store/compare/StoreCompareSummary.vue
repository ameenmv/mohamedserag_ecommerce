<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { ProductDetail } from '@serag/shared'
import {
  buildCompareSummary,
  type CompareTableRow,
} from '~/utils/compare-table'

const props = defineProps<{
  products: readonly ProductDetail[]
  rows: readonly CompareTableRow[]
}>()

const { locale, t } = useI18n()

const summaryText = computed(() =>
  buildCompareSummary(props.products, props.rows, {
    locale: locale.value === 'en' ? 'en' : 'ar',
  }),
)
</script>

<template>
  <div
    v-if="summaryText"
    class="relative overflow-hidden rounded-3xl border border-serag-gold/30 bg-gradient-to-br from-serag-ivory/80 via-card to-card p-5 shadow-xs sm:p-6 dark:from-card dark:via-card dark:to-card/90"
  >
    <!-- Brand gold accent indicator on start side -->
    <div
      class="absolute inset-y-0 start-0 w-1.5 bg-gradient-to-b from-serag-gold to-serag-gold-hi"
      aria-hidden="true"
    />

    <div class="flex items-start gap-3.5 ps-2">
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-serag-gold/15 text-serag-gold-ink dark:text-serag-gold-hi"
        aria-hidden="true"
      >
        <Sparkles class="size-4.5 stroke-[2]" />
      </div>

      <div class="flex-1 space-y-1">
        <span class="eyebrow block text-[11px] font-bold uppercase tracking-wider text-serag-gold-ink dark:text-serag-gold-hi">
          {{ t('store.compare.summaryTitle') }}
        </span>
        <p class="text-sm font-semibold leading-relaxed text-foreground sm:text-base">
          {{ summaryText }}
        </p>
      </div>
    </div>
  </div>
</template>
