<script setup lang="ts">
import { waLink, type AdminOrderCustomer } from '@serag/shared'
import { MapPin, MessageCircle, Phone, User } from '@lucide/vue'

const props = defineProps<{
  customer: AdminOrderCustomer
}>()

const { t } = useI18n()

const whatsappChatUrl = computed(() => {
  return waLink(props.customer.phone, '')
})
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <div class="flex items-center gap-2 border-b border-border/60 pb-3">
      <User class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <h2 class="text-sm font-bold text-foreground">
        {{ t('admin.orders.detail.customerTitle') }}
      </h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div>
        <span class="text-muted-foreground block mb-1">{{ t('admin.orders.detail.customerName') }}</span>
        <span class="text-sm font-bold text-foreground">{{ customer.name }}</span>
      </div>

      <div>
        <span class="text-muted-foreground block mb-1">{{ t('admin.orders.detail.customerPhone') }}</span>
        <div class="flex items-center gap-3">
          <a
            :href="`tel:${customer.phone}`"
            class="font-mono text-sm font-bold text-serag-night dark:text-serag-gold hover:underline inline-flex items-center gap-1.5"
            dir="ltr"
          >
            <Phone class="size-3.5" aria-hidden="true" />
            <span>{{ customer.phone }}</span>
          </a>

          <a
            :href="whatsappChatUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <MessageCircle class="size-3.5" aria-hidden="true" />
            <span>{{ t('admin.orders.detail.chatWhatsapp') }}</span>
          </a>
        </div>
      </div>
    </div>

    <div class="text-xs pt-2 border-t border-border/60 flex items-start gap-2">
      <MapPin class="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
      <div class="flex flex-col gap-0.5">
        <span class="font-bold text-foreground">
          {{ customer.governorate }} — {{ customer.city }}
        </span>
        <span class="text-muted-foreground">{{ customer.address }}</span>
      </div>
    </div>

    <div class="text-xs pt-2 border-t border-border/60">
      <span class="text-muted-foreground block mb-1 font-semibold">
        {{ t('admin.orders.detail.customerNotes') }}
      </span>
      <p v-if="customer.notes" class="text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
        {{ customer.notes }}
      </p>
      <p v-else class="text-muted-foreground italic">
        {{ t('admin.orders.detail.noNotes') }}
      </p>
    </div>
  </div>
</template>
