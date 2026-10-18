<script setup lang="ts">
import type { OrderStatus } from '@serag/shared'
import type { StatusTabItem } from '~/utils/admin-orders'

defineProps<{
  tabs: StatusTabItem[]
}>()

const emit = defineEmits<{
  select: [id: OrderStatus | 'all']
}>()

const { t } = useI18n()
</script>

<template>
  <nav
    class="flex items-center gap-1.5 overflow-x-auto border-b border-border/80 pb-2 text-sm font-medium whitespace-nowrap scrollbar-none"
    :aria-label="t('admin.orders.title')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="
        tab.active
          ? 'bg-serag-night text-white shadow-xs dark:bg-serag-gold dark:text-serag-ink'
          : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60'
      "
      :aria-current="tab.active ? 'page' : undefined"
      @click="emit('select', tab.id)"
    >
      <span>{{ t(tab.labelKey) }}</span>
      <span
        class="num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
        :class="
          tab.active
            ? 'bg-white/20 text-white dark:bg-serag-ink/20 dark:text-serag-ink'
            : 'bg-muted text-muted-foreground'
        "
      >
        {{ tab.count }}
      </span>
    </button>
  </nav>
</template>
