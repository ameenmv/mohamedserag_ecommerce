<script setup lang="ts">
import { computed } from 'vue'
import { ShieldCheck } from '@lucide/vue'
import type { BridalListView } from '@serag/shared'
import { formatDate } from '~/utils/date-format'

const props = defineProps<{
  reservation: NonNullable<BridalListView['reservation']>
}>()

const { t, locale } = useI18n()
const { money } = usePrice()

const statusKeyMap: Record<string, string> = {
  draft: 'store.bridal.status.draft',
  awaiting_deposit: 'store.bridal.status.awaitingDeposit',
  locked: 'store.bridal.status.locked',
  delivery_agreed: 'store.bridal.status.deliveryAgreed',
  delivered: 'store.bridal.status.delivered',
  cancelled: 'store.bridal.status.cancelled',
}

const statusLabel = computed(() => {
  const bStatus = props.reservation.bridalStatus
  if (bStatus && bStatus in statusKeyMap) {
    return t(statusKeyMap[bStatus]!)
  }
  return props.reservation.status
})

const isLocked = computed(() => {
  return (
    props.reservation.bridalStatus === 'locked' ||
    (props.reservation.status === 'confirmed' && Boolean(props.reservation.lockedUntil))
  )
})

const formattedLockedDate = computed(() => {
  if (!props.reservation.lockedUntil) return ''
  return formatDate(props.reservation.lockedUntil, locale.value)
})
</script>

<template>
  <div class="mb-6 flex flex-col gap-2 rounded-2xl border border-serag-gold/50 bg-serag-gold/15 p-4 text-serag-night dark:text-serag-gold shadow-xs">
    <div class="flex items-center gap-2.5">
      <ShieldCheck class="size-5 shrink-0 text-serag-gold" aria-hidden="true" />
      <p class="text-sm font-bold">
        {{ t('store.bridal.status.banner', { status: statusLabel, no: reservation.no }) }}
      </p>
    </div>

    <!-- Deposit Paid / Required and Lock Info -->
    <div
      v-if="(reservation.depositAmount && reservation.depositAmount > 0) || (reservation.lockedUntil && isLocked)"
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs border-t border-serag-gold/30 text-serag-ink dark:text-serag-gold"
    >
      <!-- Deposit Progress -->
      <div v-if="reservation.depositAmount && reservation.depositAmount > 0" class="flex items-center gap-1.5 font-medium">
        <span>{{ t('store.bridal.status.depositProgress', { paid: money(reservation.paidAmount), required: money(reservation.depositAmount) }) }}</span>
      </div>

      <!-- Locked Until Date -->
      <div
        v-if="reservation.lockedUntil && isLocked"
        class="flex items-center gap-1.5 font-bold"
      >
        <span>{{ t('store.bridal.status.lockedUntil', { date: formattedLockedDate }) }}</span>
      </div>
    </div>
  </div>
</template>
