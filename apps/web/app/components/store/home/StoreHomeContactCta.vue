<script setup lang="ts">
import { MessageCircle } from '@lucide/vue'
import { waLink } from '@serag/shared'

const { t } = useI18n()
const settings = useStoreSettings()
const headingId = useId()

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.footer.whatsappPrefill')) : '',
)
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10 lg:pb-24">
      <div class="relative flex flex-wrap items-center justify-between gap-9 overflow-hidden rounded-[44px] bg-serag-gold px-7 py-12 text-serag-ink sm:px-14 sm:py-16">
        <div
          class="num text-outline pointer-events-none absolute -top-20 -end-14 text-[320px] leading-[0.8] font-extrabold tracking-[-6px] [--outline-color:rgba(20,32,26,.14)]"
          aria-hidden="true"
        >
          MS
        </div>
        <div class="relative max-w-[640px]">
          <h2 :id="headingId" class="mb-3.5 font-display text-[clamp(38px,5vw,68px)] leading-none">
            {{ t('store.home.contact.title') }}
          </h2>
          <p class="text-lg leading-[1.8] text-[#2F2A10] sm:text-[19px]">{{ t('store.home.contact.subtitle') }}</p>
        </div>
        <div class="relative flex flex-wrap gap-3.5">
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-ink px-8 py-4 text-lg font-bold text-serag-gold-hi transition-colors hover:bg-serag-deep focus-visible:ring-2 focus-visible:ring-serag-ink focus-visible:outline-none"
          >
            <MessageCircle class="size-5" aria-hidden="true" />
            {{ t('store.home.contact.whatsapp') }}
          </a>
          <a
            v-if="settings.phone"
            :href="`tel:${settings.phone}`"
            class="inline-flex min-h-11 items-center gap-3 rounded-full border-2 border-serag-ink px-[30px] py-3.5 text-lg font-bold transition-colors hover:bg-serag-ink hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-ink focus-visible:outline-none"
          >
            {{ t('store.home.contact.call') }}
            <span class="num">{{ settings.phone }}</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
