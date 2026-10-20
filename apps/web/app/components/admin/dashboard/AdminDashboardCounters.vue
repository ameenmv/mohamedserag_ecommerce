<script setup lang="ts">
import { DASHBOARD_COUNTERS, type DashboardCounter } from '@serag/shared'

const props = defineProps<{
  counters: DashboardCounter[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const visible = computed(() =>
  props.counters.flatMap((counter) => {
    const definition = DASHBOARD_COUNTERS.find((candidate) => candidate.id === counter.id)
    return definition ? [{ ...counter, labelKey: definition.labelKey }] : []
  }),
)

function linkTo(href: string): string {
  const [path, rawQuery] = href.split('?')
  const query: Record<string, string> = {}
  if (rawQuery) {
    for (const [key, value] of new URLSearchParams(rawQuery)) {
      query[key] = value
    }
  }
  return localePath({ path, query })
}
</script>

<template>
  <nav
    v-if="visible.length > 0"
    :aria-label="t('admin.dashboard.counters.aria')"
    class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 min-w-0"
  >
    <NuxtLink
      v-for="counter in visible"
      :key="counter.id"
      :to="linkTo(counter.href)"
      class="flex min-h-20 flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      :data-testid="`admin-dashboard-counter-${counter.id}`"
    >
      <span class="text-xs font-semibold leading-snug text-muted-foreground">
        {{ t(counter.labelKey) }}
      </span>
      <span
        class="num mt-2 text-2xl font-bold leading-none"
        :class="counter.count > 0 ? 'text-serag-night dark:text-serag-gold' : 'text-foreground/60'"
      >
        {{ counter.count }}
      </span>
    </NuxtLink>
  </nav>
</template>
