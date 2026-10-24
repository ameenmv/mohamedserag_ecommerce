<script setup lang="ts">
import { Banknote, ShieldCheck, Truck } from '@lucide/vue'

// The store's promises (same as the announcement bar), shown next to buying decisions
const items = [
  { key: 'warranty', icon: ShieldCheck },
  { key: 'delivery', icon: Truck },
  { key: 'cod', icon: Banknote },
] as const

const { t } = useI18n()
</script>

<template>
  <ul class="grid grid-cols-3 gap-2">
    <li v-for="item in items" :key="item.key" class="flex flex-col items-center gap-1.5 text-center">
      <span class="inline-flex size-10 items-center justify-center rounded-full bg-serag-cream text-serag-green dark:bg-muted/30">
        <component :is="item.icon" class="size-5" aria-hidden="true" />
      </span>
      <span class="text-[11px] leading-tight font-bold text-foreground sm:text-xs">{{ t(`store.trust.${item.key}`) }}</span>
    </li>
  </ul>
</template>
