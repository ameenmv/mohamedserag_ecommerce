<script setup lang="ts">
import { Zap } from '@lucide/vue'
import type { ProductFlash } from '@serag/shared'

defineProps<{
  flash?: ProductFlash | null
}>()

const { t } = useI18n()
</script>

<template>
  <span
    v-if="flash"
    class="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:border-serag-gold/40 dark:bg-serag-gold/20 dark:text-serag-gold-hi sm:text-[11px]"
  >
    <Zap
      class="size-3 shrink-0 fill-amber-500 text-amber-800 dark:fill-serag-gold dark:text-serag-gold"
      aria-hidden="true"
    />
    <span class="truncate">{{ t('store.flash.badge') }}</span>
  </span>
</template>
