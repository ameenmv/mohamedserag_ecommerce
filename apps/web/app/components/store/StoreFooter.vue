<script setup lang="ts">
import { MapPin, MessageCircle, Phone } from '@lucide/vue'
import { waLink } from '@serag/shared'
import { FOOTER_LINKS, FOOTER_STORE_SECTIONS } from '~/constants/navigation'

const { t } = useI18n()
const settings = useStoreSettings()
const { track } = useAnalytics()

const whatsappUrl = computed(() =>
  waLink(settings.whatsapp, t('store.footer.whatsappPrefill')),
)
</script>

<template>
  <footer class="bg-sidebar text-sidebar-foreground">
    <div class="mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
        <!-- Brand & about blurb -->
        <StoreFooterBrand />

        <!-- Store quick links -->
        <StoreFooterColumn
          class="lg:col-span-2"
          :title="t('store.footer.shopTitle')"
          :links="FOOTER_STORE_SECTIONS"
        />

        <!-- Info & policy links required by PRD -->
        <StoreFooterColumn
          class="lg:col-span-3"
          :title="t('store.footer.infoTitle')"
          :links="FOOTER_LINKS"
          grid-cols-class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-1"
        />

        <!-- Showroom address & contact -->
        <div class="flex flex-col gap-3 lg:col-span-3">
          <h2 class="mb-1 text-lg font-bold text-serag-ivory">
            {{ t('store.footer.contactTitle') }}
          </h2>
          <div class="flex items-start gap-2.5 text-base">
            <MapPin class="mt-1 size-5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <div>
              <div class="font-semibold text-serag-ivory">{{ t('store.footer.mansouraEgypt') }}</div>
              <div class="text-sm text-sidebar-foreground">{{ t('store.footer.showroomAddress') }}</div>
            </div>
          </div>
          <a
            :href="`tel:${settings.phone}`"
            class="inline-flex min-h-11 items-center gap-2.5 rounded-lg px-1 text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
          >
            <Phone class="size-5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <span class="num">{{ settings.phone }}</span>
          </a>
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sidebar-primary px-5 font-bold text-sidebar-primary-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
            @click="track('whatsapp_click', { source: 'footer' })"
          >
            <MessageCircle class="size-5" aria-hidden="true" />
            <span>{{ t('store.footer.chatOnWhatsapp') }}</span>
          </a>
        </div>
      </div>

      <!-- Payment methods row -->
      <StoreFooterPaymentMethods />

      <!-- Copyright -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-serag-ivory/10 pt-5 text-xs text-sidebar-foreground/80">
        <span>© <span class="num">2026</span> {{ settings.name }}. {{ t('store.footer.allRightsReserved') }}</span>
        <span>{{ t('store.footer.deliveryNotice') }}</span>
      </div>
    </div>
  </footer>
</template>
