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
const hasDeposit = computed(() =>
  Boolean(props.summary.deposit || (props.summary.depositAmount && props.summary.depositAmount > 0)),
)
const depositRequired = computed(() => props.summary.deposit?.required ?? props.summary.depositAmount ?? 0)
const depositPaid = computed(() => props.summary.deposit?.paid ?? props.summary.paidAmount)
const depositRemainingVal = computed(
  () => props.summary.deposit?.remaining ?? props.summary.depositRemaining ?? 0,
)

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

      <!-- Deposit Breakdown for Deposit Orders -->
      <template v-if="hasDeposit">
        <div class="flex items-center justify-between py-2.5">
          <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositRequired') }}</span>
          <span class="num font-bold text-foreground">{{ money(depositRequired) }}</span>
        </div>
        <div class="flex items-center justify-between py-2.5">
          <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositPaid') }}</span>
          <span class="num font-bold text-foreground">{{ money(depositPaid) }}</span>
        </div>
        <div class="flex items-center justify-between py-2.5">
          <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositRemaining') }}</span>
          <span class="num font-bold text-foreground">{{ money(depositRemainingVal) }}</span>
        </div>
      </template>

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
