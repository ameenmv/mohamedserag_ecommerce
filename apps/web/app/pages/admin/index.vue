<script setup lang="ts">
import type { DashboardCounterId } from '@serag/shared'
import { useAdminDashboard } from '~/composables/useAdminDashboard'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.nav.overview') })

const { user } = useAdminAuth()
const { range, summary, loading, error, load, setRange } = useAdminDashboard()

await load()

function counterCount(id: DashboardCounterId): number | null {
  return summary.value?.counters.find((counter) => counter.id === id)?.count ?? null
}

const newOrders = computed(() => counterCount('newOrders'))
const locksExpiring = computed(() => counterCount('locksExpiring') ?? 0)

/**
 * "Nothing waiting for you" is inferred when every counter and both the current
 * and previous period totals are all zero (the API has no explicit hasOrders flag).
 */
const isCalm = computed(() => {
  const data = summary.value
  if (!data) return false
  const countersZero = data.counters.every((counter) => counter.count === 0)
  const totalsZero =
    data.totals.revenue === 0 &&
    data.totals.deliveredOrders === 0 &&
    data.totals.deposits === 0
  const previousZero =
    data.previousTotals.revenue === 0 &&
    data.previousTotals.deliveredOrders === 0 &&
    data.previousTotals.deposits === 0
  return countersZero && totalsZero && previousZero
})
</script>

<template>
  <section class="flex flex-col gap-6 p-6">
    <AdminDashboardWelcomeHeader :name="user?.name" :new-orders="newOrders" :calm="isCalm" />

    <!-- Error State -->
    <div
      v-if="error"
      role="alert"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center"
    >
      <p class="text-sm font-semibold text-destructive">
        {{ t('admin.dashboard.error') }}
      </p>
      <p class="text-xs text-destructive/80 break-words">
        {{ error }}
      </p>
      <button
        type="button"
        class="inline-flex min-h-10 items-center justify-center rounded-xl border border-input bg-background px-4 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="load(true)"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Loading Skeleton -->
    <template v-else-if="loading && !summary">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <div v-for="i in 7" :key="i" class="h-20 w-full rounded-2xl bg-muted/50 animate-pulse" />
      </div>
      <div class="h-96 w-full rounded-2xl bg-muted/50 animate-pulse" />
    </template>

    <template v-else-if="summary">
      <AdminDashboardCounters :counters="summary.counters" />

      <AdminDashboardExpiringLocks v-if="locksExpiring > 0" />

      <AdminDashboardEmptyState v-if="isCalm" />

      <AdminDashboardSales :summary="summary" :range="range" @set-range="setRange" />
    </template>
  </section>
</template>
