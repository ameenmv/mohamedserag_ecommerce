<script setup lang="ts">
import { formatDateTime } from '~/utils/date-format'
import { statusTemplateKey, type AdminOrderDetail } from '@serag/shared'
import { ArrowRight, MessageCircle, Printer } from '@lucide/vue'
import { statusBadgeClass } from '~/utils/admin-orders'

const props = defineProps<{
  detail: AdminOrderDetail
  actionPending?: boolean
}>()

const emit = defineEmits<{
  'send-whatsapp': []
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const hasWhatsappTemplate = computed(() => {
  return statusTemplateKey(props.detail.status) !== null
})

</script>

<template>
  <header class="flex flex-col gap-4 border-b border-border/80 pb-5 min-w-0">
    <div class="flex items-center justify-between gap-3">
      <NuxtLink
        :to="localePath('/admin/orders')"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight class="size-4 rtl:rotate-0 rotate-180" aria-hidden="true" />
        <span>{{ t('admin.orders.detail.backToList') }}</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <button
          v-if="hasWhatsappTemplate"
          type="button"
          :disabled="actionPending"
          class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50 transition-colors disabled:opacity-50"
          @click="emit('send-whatsapp')"
        >
          <MessageCircle class="size-4" aria-hidden="true" />
          <span>{{ t('admin.orders.detail.sendWhatsapp') }}</span>
        </button>

        <NuxtLink
          :to="localePath(`/admin/orders/${detail.id}/invoice`)"
          target="_blank"
          class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-input bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-xs"
        >
          <Printer class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.orders.detail.printInvoice') }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 min-w-0">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="font-mono text-xl sm:text-2xl font-bold text-foreground break-words">
          {{ detail.no }}
        </h1>
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
          :class="statusBadgeClass(detail.status)"
        >
          {{ t(`admin.orders.status.${detail.status}`) }}
        </span>
      </div>

      <div class="text-xs text-muted-foreground">
        {{ formatDateTime(detail.createdAt, locale) }}
      </div>
    </div>
  </header>
</template>
