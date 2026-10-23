<script setup lang="ts">
import { waLink } from '@serag/shared'

const { t } = useI18n()
const settings = useStoreSettings()
const { track } = useAnalytics()

const href = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.footer.whatsappPrefill')) : '',
)
</script>

<!-- Floating WhatsApp button (tablet/desktop; phones have it in the bottom bar's reach) -->
<template>
  <a
    v-if="href"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="t('store.header.whatsappAria')"
    class="group fixed end-[26px] bottom-[26px] z-40 hidden size-[62px] items-center justify-center rounded-full bg-[#16A34A] text-white shadow-[0_18px_36px_-12px_rgba(22,163,74,.7)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 focus-visible:outline-none md:flex motion-reduce:transition-none"
    @click="track('whatsapp_click', { source: 'float' })"
  >
    <span class="animate-ping-soft absolute inset-0 rounded-full border-2 border-[#16A34A]" aria-hidden="true" />
    <svg viewBox="0 0 24 24" class="size-7 fill-current" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.4-3.9-4.6-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.2 1.1z" />
    </svg>
    <span class="pointer-events-none absolute end-[74px] rounded-xl bg-serag-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-serag-ivory opacity-0 transition-opacity group-hover:opacity-100">
      {{ t('store.header.askOnWhatsapp') }}
    </span>
  </a>
</template>
