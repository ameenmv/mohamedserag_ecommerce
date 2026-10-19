<script setup lang="ts">
import type { ImportPlanSummary } from '@serag/shared'
import type { ImportFilterMode } from '~/composables/useProductImport'

const props = defineProps<{
  summary: ImportPlanSummary
  currentFilter: ImportFilterMode
}>()

const emit = defineEmits<{
  'update:filter': [filter: ImportFilterMode]
}>()

const { t } = useI18n()

interface FilterChip {
  key: ImportFilterMode
  label: string
  count: number
  colorClass: string
}

const chips = computed<FilterChip[]>(() => [
  {
    key: 'changes',
    label: t('admin.products.import.summary.changesOnly'),
    count: props.summary.update,
    colorClass: 'text-emerald-700 dark:text-emerald-300 border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    key: 'all',
    label: t('admin.products.import.summary.allRows'),
    count:
      props.summary.update +
      props.summary.unchanged +
      props.summary.notFound +
      props.summary.error +
      props.summary.duplicate,
    colorClass: 'text-foreground border-border bg-card',
  },
  {
    key: 'update',
    label: t('admin.products.import.summary.updates'),
    count: props.summary.update,
    colorClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-950/20',
  },
  {
    key: 'unchanged',
    label: t('admin.products.import.summary.unchanged'),
    count: props.summary.unchanged,
    colorClass: 'text-muted-foreground border-border bg-muted/40',
  },
  {
    key: 'not_found',
    label: t('admin.products.import.summary.notFound'),
    count: props.summary.notFound,
    colorClass: 'text-amber-700 dark:text-amber-300 border-amber-300/40 bg-amber-50 dark:bg-amber-950/30',
  },
  {
    key: 'duplicate',
    label: t('admin.products.import.summary.duplicate'),
    count: props.summary.duplicate,
    colorClass: 'text-sky-700 dark:text-sky-300 border-sky-300/40 bg-sky-50 dark:bg-sky-950/30',
  },
  {
    key: 'error',
    label: t('admin.products.import.summary.errors'),
    count: props.summary.error,
    colorClass: 'text-destructive border-destructive/30 bg-destructive/10',
  },
])
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
        {{ t('admin.products.import.summary.title') }}
      </h3>
    </div>

    <!-- Filter chips scrollable list -->
    <div
      role="tablist"
      :aria-label="t('admin.products.import.summary.filterLabel')"
      class="flex flex-wrap gap-2"
    >
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        role="tab"
        :aria-selected="currentFilter === c.key"
        :class="[
          'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          currentFilter === c.key
            ? 'ring-2 ring-serag-gold border-serag-gold shadow-xs font-bold'
            : 'opacity-85 hover:opacity-100',
          c.colorClass,
        ]"
        @click="emit('update:filter', c.key)"
      >
        <span>{{ c.label }}</span>
        <span
          class="num inline-flex size-5 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-[11px]"
        >
          {{ c.count }}
        </span>
      </button>
    </div>
  </div>
</template>
