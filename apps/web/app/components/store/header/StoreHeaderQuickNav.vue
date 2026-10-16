<script setup lang="ts">
import type { StoreNavItem } from '~/constants/navigation'

defineProps<{
  items: readonly StoreNavItem[]
  isActive: (path: string) => boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <nav
    :aria-label="t('store.header.quickNavAria')"
    class="flex items-center gap-1.5 overflow-x-auto border-t border-sidebar-border bg-serag-deep px-3 py-2 text-serag-ivory lg:hidden"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="localePath(item.to)"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :class="[
        'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
        isActive(item.to)
          ? 'bg-accent font-bold text-accent-foreground'
          : 'bg-serag-ivory/10 text-serag-ivory hover:bg-serag-ivory/20',
      ]"
    >
      <span>{{ t(item.labelKey) }}</span>
    </NuxtLink>
  </nav>
</template>
