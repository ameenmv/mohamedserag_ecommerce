<script setup lang="ts">
import { Banknote, ShieldCheck, Truck } from '@lucide/vue'

const props = defineProps<{
  warranty?: string | null
}>()

const { t } = useI18n()

const warrantyLabel = computed(() => {
  if (props.warranty?.trim()) {
    return props.warranty.trim()
  }
  return t('store.trust.warranty')
})

const items = computed(() => [
  { key: 'warranty', icon: ShieldCheck, label: warrantyLabel.value },
  { key: 'delivery', icon: Truck, label: t('store.trust.delivery') },
  { key: 'cod', icon: Banknote, label: t('store.trust.cod') },
])
</script>

<template>
  <ul class="grid grid-cols-3 gap-2">
    <li v-for="item in items" :key="item.key" class="flex flex-col items-center gap-1.5 text-center">
      <span class="inline-flex size-10 items-center justify-center rounded-full bg-serag-cream text-serag-green dark:bg-muted/30">
        <component :is="item.icon" class="size-5" aria-hidden="true" />
      </span>
      <span class="text-[11px] leading-tight font-bold text-foreground sm:text-xs">{{ item.label }}</span>
    </li>
  </ul>
</template>
