<script setup lang="ts">
import { computed } from 'vue'
import type { AdminConfirmSummary as AdminConfirmSummaryType } from '@serag/shared'
import { remainingPiastres } from '~/utils/admin-confirm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  summary: AdminConfirmSummaryType
}>()

const { t } = useI18n()
const { money } = usePrice()

const remaining = computed(() => remainingPiastres(props.summary))
const expectedLabel = computed(() => {
  if (props.summary.deposit) {
    return t('admin.confirm.summary.depositExpected', { pct: props.summary.deposit.pct })
  }
  return t('admin.confirm.summary.expected')
})
</script>

<template>
  <Card class="w-full border-border/80 shadow-xs">
    <CardHeader class="pb-3">
      <CardTitle class="text-base font-bold text-foreground">
        {{ t('admin.confirm.summary.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col divide-y divide-border/60 text-sm">
      <!-- Customer -->
      <div class="flex items-center justify-between py-2.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.customer') }}</span>
        <span class="font-bold text-foreground">{{ summary.customerFirstName }}</span>
      </div>

      <!-- Payment Method -->
      <div class="flex items-center justify-between py-2.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.method') }}</span>
        <span class="font-bold text-foreground">{{ t(`admin.orders.paymentMethods.${summary.method}`) }}</span>
      </div>

      <!-- Order Total -->
      <div class="flex items-center justify-between py-2.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.total') }}</span>
        <span class="num font-bold text-foreground">{{ money(summary.total) }}</span>
      </div>

      <!-- Already Paid -->
      <div class="flex items-center justify-between py-2.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.paid') }}</span>
        <span class="num font-medium text-foreground">{{ money(summary.paidAmount) }}</span>
      </div>

      <!-- Expected Amount (Highlight) -->
      <div class="flex items-center justify-between py-3 bg-serag-gold/5 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <span class="font-semibold text-foreground">{{ expectedLabel }}</span>
        <span class="num text-base font-extrabold text-foreground">
          {{ money(summary.expectedAmount) }}
        </span>
      </div>

      <!-- Remaining Amount -->
      <div class="flex items-center justify-between py-2.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.remaining') }}</span>
        <span class="num font-bold text-foreground">{{ money(remaining) }}</span>
      </div>
    </CardContent>
  </Card>
</template>
