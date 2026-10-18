<script setup lang="ts">
import { formatDateTime } from '~/utils/date-format'
import type { AdminOrderWhatsAppMessage } from '@serag/shared'
import { CheckCheck, MessageCircle } from '@lucide/vue'

defineProps<{
  messages: AdminOrderWhatsAppMessage[]
}>()

const { t, locale } = useI18n()

</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <div class="flex items-center gap-2 border-b border-border/60 pb-3">
      <MessageCircle class="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <h2 class="text-sm font-bold text-foreground">
        {{ t('admin.orders.detail.whatsappMessagesTitle') }}
      </h2>
    </div>

    <div v-if="messages.length === 0" class="text-xs text-muted-foreground italic py-2">
      {{ t('admin.orders.detail.noWhatsappMessages') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-border/60">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="py-2.5 flex items-center justify-between gap-3 text-xs"
      >
        <div class="flex items-center gap-2 min-w-0">
          <CheckCheck class="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-foreground font-mono text-[11px] truncate">
              {{ msg.templateKey }}
            </span>
            <span v-if="msg.adminName" class="text-[11px] text-muted-foreground">
              {{ msg.adminName }}
            </span>
          </div>
        </div>

        <span class="text-[11px] text-muted-foreground shrink-0">
          {{ formatDateTime(msg.at, locale) }}
        </span>
      </div>
    </div>
  </div>
</template>
