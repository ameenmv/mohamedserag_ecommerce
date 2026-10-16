<script setup lang="ts">
import { MessageCircle } from '@lucide/vue'

defineProps<{
  href: string
}>()

const { track } = useAnalytics()
const { t } = useI18n()
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="t('store.header.whatsappAria')"
    class="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5 motion-reduce:transition-none"
    @click="track('whatsapp_click', { source: 'header' })"
  >
    <MessageCircle class="size-5 text-serag-gold-hi" aria-hidden="true" />
    <span class="hidden text-sm xl:inline">{{ t('store.header.whatsapp') }}</span>
  </a>
</template>
