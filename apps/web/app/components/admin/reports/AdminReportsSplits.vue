<script setup lang="ts">
import type { SplitsReport, SplitRow } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  report: SplitsReport | null
}>()

const { t } = useI18n()

interface SplitSection {
  labelKey: string
  rows: SplitRow[]
}

const sections = computed<SplitSection[]>(() => {
  const report = props.report
  if (!report) return []
  return [
    { labelKey: 'admin.reports.splits.sections.category', rows: report.byCategory },
    { labelKey: 'admin.reports.splits.sections.brand', rows: report.byBrand },
    { labelKey: 'admin.reports.splits.sections.paymentMethod', rows: report.byPaymentMethod },
    { labelKey: 'admin.reports.splits.sections.zone', rows: report.byZone },
    { labelKey: 'admin.reports.splits.sections.type', rows: report.byType },
  ]
})

// One order can span several category/brand rows (and the delivery row), so the total
// order count comes from the type split, where every delivered order appears exactly once.
const totalOrders = computed(() =>
  (props.report?.byType ?? []).reduce((sum, row) => sum + row.orders, 0),
)

function rowTotal(rows: SplitRow[]): { revenue: number; orders: number } {
  return {
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    orders: totalOrders.value,
  }
}

function rowLabel(row: SplitRow): string {
  return row.label || t('admin.reports.splits.undefinedLabel')
}
</script>

<template>
  <div v-if="report" class="grid grid-cols-1 gap-6 xl:grid-cols-2 min-w-0">
    <Card v-for="section in sections" :key="section.labelKey" class="min-w-0 shadow-xs border-border/80">
      <CardHeader class="border-b border-border/60 pb-3">
        <CardTitle class="text-base font-bold text-foreground">
          {{ t(section.labelKey) }}
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-4 min-w-0">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[22rem] text-start text-sm">
            <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                  {{ t('admin.reports.splits.table.name') }}
                </th>
                <th scope="col" class="px-3 py-3 text-start font-bold">
                  {{ t('admin.reports.splits.table.revenue') }}
                </th>
                <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                  {{ t('admin.reports.splits.table.orders') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-for="(row, index) in section.rows" :key="row.id ?? index" class="transition-colors hover:bg-muted/15">
                <td class="py-3 ps-4 pe-3 text-foreground">
                  {{ rowLabel(row) }}
                </td>
                <td class="num px-3 py-3 font-bold text-foreground">
                  {{ formatEgpWithUnit(row.revenue) }}
                </td>
                <td class="num py-3 ps-3 pe-4 text-muted-foreground">
                  {{ row.orders }}
                </td>
              </tr>
              <tr
                v-if="section.rows.length > 0"
                class="border-t-2 border-border bg-muted/30 font-bold"
              >
                <td class="py-3 ps-4 pe-3 text-foreground">
                  {{ t('admin.reports.splits.total') }}
                </td>
                <td class="num px-3 py-3 text-foreground">
                  {{ formatEgpWithUnit(rowTotal(section.rows).revenue) }}
                </td>
                <td class="num py-3 ps-3 pe-4 text-foreground">
                  {{ rowTotal(section.rows).orders }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
