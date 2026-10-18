<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'
import type { BridalListView } from '@serag/shared'

const props = defineProps<{
  reservation: NonNullable<BridalListView['reservation']>
}>()

const { t } = useI18n()

const statusLabel = computed(() => {
  const bStatus = props.reservation.bridalStatus
  if (bStatus && bStatus in statusKeyMap) {
    return t(statusKeyMap[bStatus]!)
  }
  return props.reservation.status
})

const statusKeyMap: Record<string, string> = {
  draft: 'store.bridal.status.draft',
  awaiting_deposit: 'store.bridal.status.awaitingDeposit',
  locked: 'store.bridal.status.locked',
  delivery_agreed: 'store.bridal.status.deliveryAgreed',
  delivered: 'store.bridal.status.delivered',
  cancelled: 'store.bridal.status.cancelled',
}
</script>

<template>
  <div class="mb-6 flex items-center gap-3 rounded-2xl border border-serag-gold/50 bg-serag-gold/15 p-4 text-serag-night dark:text-serag-gold">
    <ShieldCheck class="size-5 shrink-0 text-serag-gold" aria-hidden="true" />
    <p class="text-sm font-bold">
      {{ t('store.bridal.status.banner', { status: statusLabel, no: reservation.no }) }}
    </p>
  </div>
</template>
