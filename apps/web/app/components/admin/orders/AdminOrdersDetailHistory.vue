<script setup lang="ts">
import { formatDateTime } from '~/utils/date-format'
import {
  ORDER_STATUS_LABELS,
  type AdminOrderEvent,
  type OrderStatus,
} from '@serag/shared'
import { History } from '@lucide/vue'

defineProps<{
  events: AdminOrderEvent[]
}>()

const { t, locale } = useI18n()

function eventLabel(status: string): string {
  if (status === 'payment_confirmed') {
    return t('admin.orders.detail.events.payment_confirmed')
  }
  if (status === 'payment_rejected') {
    return t('admin.orders.detail.events.payment_rejected')
  }
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status
}

</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <div class="flex items-center gap-2 border-b border-border/60 pb-3">
      <History class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <h2 class="text-sm font-bold text-foreground">
        {{ t('admin.orders.detail.historyTitle') }}
      </h2>
    </div>

    <div v-if="events.length === 0" class="text-xs text-muted-foreground italic py-2">
      {{ t('admin.orders.detail.noHistory') }}
    </div>

    <div v-else class="relative ps-4 border-s-2 border-border/80 space-y-4">
      <div
        v-for="(ev, idx) in events"
        :key="idx"
        class="relative flex flex-col gap-1 text-xs"
      >
        <!-- Marker dot -->
        <span
          class="absolute -start-[21px] top-1 size-2.5 rounded-full bg-serag-night dark:bg-serag-gold"
          aria-hidden="true"
        />

        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="font-bold text-foreground">
            {{ eventLabel(ev.status) }}
          </span>
          <span class="text-[11px] text-muted-foreground">
            {{ formatDateTime(ev.at, locale) }}
          </span>
        </div>

        <p v-if="ev.note" class="text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40">
          {{ ev.note }}
        </p>

        <span v-if="ev.adminName" class="text-[11px] text-muted-foreground">
          {{ ev.adminName }}
        </span>
      </div>
    </div>
  </div>
</template>
