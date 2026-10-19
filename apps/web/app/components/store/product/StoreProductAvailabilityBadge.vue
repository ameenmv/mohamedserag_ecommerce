<script setup lang="ts">
import type { ProductCardAvailability } from '@serag/shared'

const props = defineProps<{
  availability: ProductCardAvailability
}>()

const { t } = useI18n()

const label = computed(() => {
  if (props.availability.state === 'on_request') {
    return props.availability.leadTimeText || t('store.availability.onRequest')
  }
  if (props.availability.state === 'in_stock') {
    return t('store.availability.inStock')
  }
  if (props.availability.state === 'low') {
    return t('store.availability.low')
  }
  return t('store.availability.outOfStock')
})

const badgeClasses = computed(() => {
  switch (props.availability.state) {
    case 'in_stock':
      return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20'
    case 'low':
      return 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20'
    case 'on_request':
      return 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-500/20'
    case 'out':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:text-[11px]',
      badgeClasses,
    ]"
  >
    <span
      v-if="availability.state === 'in_stock'"
      class="size-1.5 shrink-0 rounded-full bg-emerald-500"
      aria-hidden="true"
    />
    <span
      v-else-if="availability.state === 'low'"
      class="size-1.5 shrink-0 rounded-full bg-amber-500"
      aria-hidden="true"
    />
    <span class="truncate">{{ label }}</span>
  </span>
</template>
