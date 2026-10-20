<script setup lang="ts">
import type { RepeatCustomersReport } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  report: RepeatCustomersReport | null
}>()

const { t } = useI18n()
</script>

<template>
  <Card v-if="report" class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="border-b border-border/60 pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.reports.tabs.repeatCustomers') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-6 pt-4 min-w-0">
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.reports.repeat.customers') }}
          </dt>
          <dd class="num text-xl font-bold text-foreground">
            {{ report.customers }}
          </dd>
        </div>
        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.reports.repeat.repeatCustomers') }}
          </dt>
          <dd class="num text-xl font-bold text-foreground">
            {{ report.repeatCustomers }}
          </dd>
        </div>
        <div class="flex flex-col gap-1 min-w-0">
          <dt class="text-xs font-semibold text-muted-foreground">
            {{ t('admin.reports.repeat.share') }}
          </dt>
          <dd class="num text-xl font-bold text-serag-green dark:text-serag-gold">
            {{ t('admin.reports.percent', { value: report.repeatPct.toFixed(1) }) }}
          </dd>
        </div>
      </dl>

      <div class="border-t border-border/60 pt-4">
        <h3 class="mb-3 text-sm font-bold text-foreground">
          {{ t('admin.reports.repeat.period') }}
        </h3>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="text-xs font-semibold text-muted-foreground">
              {{ t('admin.reports.repeat.customers') }}
            </dt>
            <dd class="num text-lg font-bold text-foreground">
              {{ report.periodCustomers }}
            </dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="text-xs font-semibold text-muted-foreground">
              {{ t('admin.reports.repeat.repeatCustomers') }}
            </dt>
            <dd class="num text-lg font-bold text-foreground">
              {{ report.periodRepeat }}
            </dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="text-xs font-semibold text-muted-foreground">
              {{ t('admin.reports.repeat.share') }}
            </dt>
            <dd class="num text-lg font-bold text-serag-green dark:text-serag-gold">
              {{ t('admin.reports.percent', { value: report.periodRepeatPct.toFixed(1) }) }}
            </dd>
          </div>
        </dl>
      </div>
    </CardContent>
  </Card>
</template>
