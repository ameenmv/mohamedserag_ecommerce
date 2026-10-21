<script setup lang="ts">
import {
  formatEgp,
  formatEgpWithUnit,
  periodChange,
  type DashboardRange,
  type DashboardSummary,
} from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminChartBar from '~/components/admin/charts/AdminChartBar.vue'
import AdminChartLine from '~/components/admin/charts/AdminChartLine.vue'
import { formatDate, formatDayMonth } from '~/utils/date-format'

const props = defineProps<{
  summary: DashboardSummary
  range: DashboardRange
}>()

const emit = defineEmits<{
  'set-range': [range: DashboardRange]
}>()

const { t, locale } = useI18n()

const ranges: DashboardRange[] = [7, 30, 90]

const revenuePoints = computed(() =>
  props.summary.series.map((point) => ({
    label: formatDate(point.date, locale.value),
    axisLabel: formatDayMonth(point.date, locale.value),
    value: point.revenue,
  })),
)

const orderPoints = computed(() =>
  props.summary.series.map((point) => ({
    label: formatDate(point.date, locale.value),
    axisLabel: formatDayMonth(point.date, locale.value),
    value: point.deliveredOrders,
  })),
)

const depositPoints = computed(() =>
  props.summary.series.map((point) => ({
    label: formatDate(point.date, locale.value),
    axisLabel: formatDayMonth(point.date, locale.value),
    value: point.deposits,
  })),
)

const formatEgpAxis = (n: number) => formatEgp(n)
const formatCountAxis = (n: number) => String(n)

function changeLabel(current: number, previous: number): string | null {
  const change = periodChange(current, previous)
  if (change === null) return null
  return t('admin.dashboard.sales.vsPrevious', { change: String(change) })
}
</script>

<template>
  <Card class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="gap-3 border-b border-border/60 pb-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle class="text-base font-bold text-foreground">
          {{ t('admin.dashboard.sales.title') }}
        </CardTitle>

        <!-- Range toggle -->
        <div
          role="group"
          :aria-label="t('admin.dashboard.sales.title')"
          class="inline-flex w-fit rounded-xl border border-border/80 bg-muted/40 p-1"
        >
          <button
            v-for="option in ranges"
            :key="option"
            type="button"
            class="min-h-9 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            :class="
              range === option
                ? 'bg-serag-night text-white dark:bg-serag-gold dark:text-serag-night'
                : 'text-muted-foreground hover:text-foreground'
            "
            :aria-pressed="range === option"
            @click="emit('set-range', option)"
          >
            {{ t(`admin.dashboard.sales.range${option}`) }}
          </button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-col gap-6 pt-4">
      <!-- Totals row -->
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.dashboard.sales.revenue') }}
          </dt>
          <dd class="num text-xl font-bold text-foreground">
            {{ formatEgpWithUnit(summary.totals.revenue) }}
          </dd>
          <dd v-if="changeLabel(summary.totals.revenue, summary.previousTotals.revenue)" class="num text-[11px] font-semibold text-serag-green dark:text-serag-gold">
            {{ changeLabel(summary.totals.revenue, summary.previousTotals.revenue) }}
          </dd>
          <dd v-else class="text-[11px] text-muted-foreground">
            {{ t('admin.dashboard.sales.noPrevious') }}
          </dd>
        </div>

        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.dashboard.sales.deliveredOrders') }}
          </dt>
          <dd class="num text-xl font-bold text-foreground">
            {{ summary.totals.deliveredOrders }}
          </dd>
          <dd v-if="changeLabel(summary.totals.deliveredOrders, summary.previousTotals.deliveredOrders)" class="num text-[11px] font-semibold text-serag-green dark:text-serag-gold">
            {{ changeLabel(summary.totals.deliveredOrders, summary.previousTotals.deliveredOrders) }}
          </dd>
          <dd v-else class="text-[11px] text-muted-foreground">
            {{ t('admin.dashboard.sales.noPrevious') }}
          </dd>
        </div>

        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.dashboard.sales.deposits') }}
          </dt>
          <dd class="num text-xl font-bold text-foreground">
            {{ formatEgpWithUnit(summary.totals.deposits) }}
          </dd>
          <dd v-if="changeLabel(summary.totals.deposits, summary.previousTotals.deposits)" class="num text-[11px] font-semibold text-serag-green dark:text-serag-gold">
            {{ changeLabel(summary.totals.deposits, summary.previousTotals.deposits) }}
          </dd>
          <dd v-else class="text-[11px] text-muted-foreground">
            {{ t('admin.dashboard.sales.noPrevious') }}
          </dd>
          <dd class="text-[11px] leading-snug text-muted-foreground">
            {{ t('admin.dashboard.sales.depositsNote') }}
          </dd>
        </div>
      </dl>

      <!-- Charts -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 min-w-0">
        <div class="min-w-0 lg:col-span-2">
          <h3 class="mb-2 text-sm font-bold text-foreground">
            {{ t('admin.dashboard.sales.revenueChart') }}
          </h3>
          <AdminChartLine
            :points="revenuePoints"
            :format-value="formatEgpAxis"
            :label="t('admin.dashboard.sales.revenueChart')"
          />
        </div>

        <div class="min-w-0">
          <h3 class="mb-2 text-sm font-bold text-foreground">
            {{ t('admin.dashboard.sales.ordersChart') }}
          </h3>
          <AdminChartBar
            :points="orderPoints"
            :format-value="formatCountAxis"
            :label="t('admin.dashboard.sales.ordersChart')"
          />
        </div>

        <div class="min-w-0">
          <h3 class="mb-2 text-sm font-bold text-foreground">
            {{ t('admin.dashboard.sales.depositsChart') }}
          </h3>
          <AdminChartLine
            :points="depositPoints"
            :format-value="formatEgpAxis"
            :label="t('admin.dashboard.sales.depositsChart')"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
