<script setup lang="ts">
import type { BridalFunnelReport } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  report: BridalFunnelReport | null
}>()

const { t } = useI18n()

interface FunnelStep {
  labelKey: string
  count: number
  conversion: string | null
}

const steps = computed<FunnelStep[]>(() => {
  const report = props.report
  if (!report) return []
  return [
    { labelKey: 'admin.reports.funnel.steps.lists', count: report.listsCreated, conversion: null },
    {
      labelKey: 'admin.reports.funnel.steps.reservations',
      count: report.reservationsPaid,
      conversion: report.listToReservationPct.toFixed(1),
    },
    {
      labelKey: 'admin.reports.funnel.steps.delivered',
      count: report.delivered,
      conversion: report.reservationToDeliveredPct.toFixed(1),
    },
  ]
})
</script>

<template>
  <Card v-if="report" class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="border-b border-border/60 pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.reports.tabs.bridalFunnel') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-4 min-w-0">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[24rem] text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                {{ t('admin.reports.funnel.table.stage') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.funnel.table.count') }}
              </th>
              <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                {{ t('admin.reports.funnel.table.conversion') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="step in steps" :key="step.labelKey" class="transition-colors hover:bg-muted/15">
              <td class="py-3 ps-4 pe-3 text-foreground">
                {{ t(step.labelKey) }}
              </td>
              <td class="num px-3 py-3 font-bold text-foreground">
                {{ step.count }}
              </td>
              <td class="num py-3 ps-3 pe-4 text-muted-foreground">
                <template v-if="step.conversion !== null">
                  {{ t('admin.reports.percent', { value: step.conversion }) }}
                </template>
                <span v-else aria-hidden="true">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</template>
