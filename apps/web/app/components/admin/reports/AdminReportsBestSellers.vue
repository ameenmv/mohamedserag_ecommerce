<script setup lang="ts">
import type { BestSellerRow } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  items: BestSellerRow[] | null
}>()

const { t } = useI18n()
</script>

<template>
  <Card v-if="items" class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="border-b border-border/60 pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.reports.tabs.bestSellers') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-4 min-w-0">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[36rem] text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3 ps-4 pe-3 text-start font-bold">
                {{ t('admin.reports.bestSellers.table.name') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.bestSellers.table.modelCode') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.bestSellers.table.units') }}
              </th>
              <th scope="col" class="px-3 py-3 text-start font-bold">
                {{ t('admin.reports.bestSellers.table.revenue') }}
              </th>
              <th scope="col" class="py-3 ps-3 pe-4 text-start font-bold">
                {{ t('admin.reports.bestSellers.table.stock') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="item in items" :key="item.productId" class="transition-colors hover:bg-muted/15">
              <td class="py-3 ps-4 pe-3 text-foreground">
                {{ item.name }}
              </td>
              <td class="num px-3 py-3 text-xs text-muted-foreground">
                {{ item.modelCode }}
              </td>
              <td class="num px-3 py-3 font-bold text-foreground">
                {{ item.units }}
              </td>
              <td class="num px-3 py-3 font-bold text-serag-green dark:text-serag-gold">
                {{ formatEgpWithUnit(item.revenue) }}
              </td>
              <td class="num py-3 ps-3 pe-4 text-muted-foreground">
                {{ item.stock }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</template>
