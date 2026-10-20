<script setup lang="ts">
import type { CouponReportRow } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  items: CouponReportRow[] | null
}>()

const { t } = useI18n()
</script>

<template>
  <Card v-if="items" class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="border-b border-border/60 pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.reports.tabs.coupons') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-4 min-w-0">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[32rem] text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                {{ t('admin.reports.coupons.table.code') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.coupons.table.uses') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.coupons.table.discount') }}
              </th>
              <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                {{ t('admin.reports.coupons.table.revenue') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="item in items" :key="item.couponId" class="transition-colors hover:bg-muted/15">
              <td class="py-3 ps-4 pe-3 font-mono font-bold tracking-wide text-foreground">
                {{ item.code }}
              </td>
              <td class="num px-3 py-3 font-bold text-foreground">
                {{ item.uses }}
              </td>
              <td class="num px-3 py-3 text-foreground">
                {{ formatEgpWithUnit(item.discount) }}
              </td>
              <td class="num py-3 ps-3 pe-4 font-bold text-serag-green dark:text-serag-gold">
                {{ formatEgpWithUnit(item.revenue) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</template>
