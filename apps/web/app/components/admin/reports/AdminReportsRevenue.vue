<script setup lang="ts">
import type { RevenueReport } from '@serag/shared'
import { formatEgp, formatEgpWithUnit } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminChartBar from '~/components/admin/charts/AdminChartBar.vue'
import AdminChartLine from '~/components/admin/charts/AdminChartLine.vue'
import { formatBucketAxisLabel, formatBucketLabel } from '~/utils/admin-reports'

const props = defineProps<{
  report: RevenueReport | null
}>()

const { t, locale } = useI18n()

const report = computed(() => props.report)

const revenuePoints = computed(() =>
  (report.value?.buckets ?? []).map((bucket) => ({
    label: formatBucketLabel(bucket.key, locale.value),
    axisLabel: formatBucketAxisLabel(bucket.key, locale.value),
    value: bucket.revenue,
  })),
)

const orderPoints = computed(() =>
  (report.value?.buckets ?? []).map((bucket) => ({
    label: formatBucketLabel(bucket.key, locale.value),
    axisLabel: formatBucketAxisLabel(bucket.key, locale.value),
    value: bucket.orders,
  })),
)

const formatEgpAxis = (n: number) => formatEgp(n)
const formatCountAxis = (n: number) => String(n)

function bucketLabel(key: string): string {
  return formatBucketLabel(key, locale.value)
}
</script>

<template>
  <div v-if="report" class="flex flex-col gap-6 min-w-0">
    <!-- Totals -->
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
      <div class="flex flex-col gap-1 min-w-0">
        <dt class="text-xs font-semibold text-muted-foreground">
          {{ t('admin.reports.totals.revenue') }}
        </dt>
        <dd class="num text-xl font-bold text-foreground">
          {{ formatEgpWithUnit(report.totals.revenue) }}
        </dd>
      </div>
      <div class="flex flex-col gap-1 min-w-0">
        <dt class="text-xs font-semibold text-muted-foreground">
          {{ t('admin.reports.totals.orders') }}
        </dt>
        <dd class="num text-xl font-bold text-foreground">
          {{ report.totals.orders }}
        </dd>
      </div>
      <div class="flex flex-col gap-1 min-w-0">
        <dt class="text-xs font-semibold text-muted-foreground">
          {{ t('admin.reports.totals.aov') }}
        </dt>
        <dd class="num text-xl font-bold text-foreground">
          {{ formatEgpWithUnit(report.totals.aov) }}
        </dd>
      </div>
    </dl>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 min-w-0">
      <div class="min-w-0 lg:col-span-2">
        <h3 class="mb-2 text-sm font-bold text-foreground">
          {{ t('admin.reports.revenue.revenueChart') }}
        </h3>
        <AdminChartLine
          :points="revenuePoints"
          :format-value="formatEgpAxis"
          :label="t('admin.reports.revenue.revenueChart')"
        />
      </div>

      <div class="min-w-0 lg:col-span-2">
        <h3 class="mb-2 text-sm font-bold text-foreground">
          {{ t('admin.reports.revenue.ordersChart') }}
        </h3>
        <AdminChartBar
          :points="orderPoints"
          :format-value="formatCountAxis"
          :label="t('admin.reports.revenue.ordersChart')"
        />
      </div>
    </div>

    <!-- Buckets table -->
    <Card class="min-w-0 shadow-xs border-border/80">
      <CardHeader class="border-b border-border/60 pb-3">
        <CardTitle class="text-base font-bold text-foreground">
          {{ t('admin.reports.revenue.table.caption') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-4 min-w-0">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[28rem] text-start text-sm">
            <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                  {{ t('admin.reports.revenue.table.period') }}
                </th>
                <th scope="col" class="px-3 py-3 text-start font-bold">
                  {{ t('admin.reports.revenue.table.revenue') }}
                </th>
                <th scope="col" class="px-3 py-3 text-start font-bold">
                  {{ t('admin.reports.revenue.table.orders') }}
                </th>
                <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                  {{ t('admin.reports.revenue.table.aov') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-for="bucket in report.buckets" :key="bucket.key" class="transition-colors hover:bg-muted/15">
                <td class="py-3 ps-4 pe-3 text-foreground">
                  {{ bucketLabel(bucket.key) }}
                </td>
                <td class="num px-3 py-3 font-bold text-foreground">
                  {{ formatEgpWithUnit(bucket.revenue) }}
                </td>
                <td class="num px-3 py-3 text-foreground">
                  {{ bucket.orders }}
                </td>
                <td class="num py-3 ps-3 pe-4 text-muted-foreground">
                  {{ formatEgpWithUnit(bucket.aov) }}
                </td>
              </tr>
              <tr class="border-t-2 border-border bg-muted/30 font-bold">
                <td class="py-3 ps-4 pe-3 text-foreground">
                  {{ t('admin.reports.revenue.total') }}
                </td>
                <td class="num px-3 py-3 text-foreground">
                  {{ formatEgpWithUnit(report.totals.revenue) }}
                </td>
                <td class="num px-3 py-3 text-foreground">
                  {{ report.totals.orders }}
                </td>
                <td class="num py-3 ps-3 pe-4 text-foreground">
                  {{ formatEgpWithUnit(report.totals.aov) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
