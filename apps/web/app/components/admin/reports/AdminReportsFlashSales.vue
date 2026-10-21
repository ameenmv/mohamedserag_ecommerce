<script setup lang="ts">
import type { FlashSaleReportRow } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '~/utils/date-format'

defineProps<{
  items: FlashSaleReportRow[] | null
}>()

const { t, locale } = useI18n()
</script>

<template>
  <Card v-if="items" class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="border-b border-border/60 pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.reports.tabs.flashSales') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-3 pt-4 min-w-0">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[40rem] text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                {{ t('admin.reports.flash.table.name') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.flash.table.period') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.flash.table.units') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.flash.table.revenue') }}
              </th>
              <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                {{ t('admin.reports.flash.table.discount') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="item in items" :key="item.flashSaleId" class="transition-colors hover:bg-muted/15">
              <td class="py-3 ps-4 pe-3 text-foreground">
                {{ item.name }}
              </td>
              <td class="px-3 py-3 text-xs text-muted-foreground">
                <span class="num">{{ formatDate(item.startsAt, locale) }}</span>
                <span aria-hidden="true"> – </span>
                <span class="num">{{ formatDate(item.endsAt, locale) }}</span>
              </td>
              <td class="num px-3 py-3 font-bold text-foreground">
                {{ item.units }}
              </td>
              <td class="num px-3 py-3 font-bold text-serag-green dark:text-serag-gold">
                {{ formatEgpWithUnit(item.revenue) }}
              </td>
              <td class="num py-3 ps-3 pe-4 text-foreground">
                {{ formatEgpWithUnit(item.discount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] leading-snug text-muted-foreground">
        {{ t('admin.reports.flash.discountNote') }}
      </p>
    </CardContent>
  </Card>
</template>
