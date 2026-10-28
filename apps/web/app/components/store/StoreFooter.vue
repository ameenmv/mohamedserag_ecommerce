<script setup lang="ts">
import { MapPin, MessageCircle, Phone } from '@lucide/vue'
import { waLink } from '@serag/shared'

const { t } = useI18n()
const localePath = useLocalePath()
const settings = useStoreSettings()
const { track } = useAnalytics()
const { links: infoLinks } = useFooterPages()
const categories = await useNavCategories()

const categoryLinks = computed(() =>
  categories.value.map((category) => ({ label: category.name, to: `/c/${category.slug}` })),
)

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.footer.whatsappPrefill')) : '',
)

const contactLinkClass =
  'inline-flex min-h-11 items-center gap-2.5 rounded-lg text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none'
</script>

<template>
  <footer class="bg-serag-night text-[#D8D3C7]">
    <div class="mx-auto max-w-7xl px-4 pt-14 pb-6 sm:px-6 lg:px-10">
      <div class="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
        <StoreFooterBrand />

        <StoreFooterColumn :title="t('store.footer.categoriesTitle')" :links="categoryLinks" />

        <StoreFooterColumn :title="t('store.footer.serviceTitle')" :links="infoLinks" />

        <div class="flex flex-col gap-2.5">
          <h2 class="mb-1 text-lg font-bold text-serag-ivory">{{ t('store.footer.contactTitle') }}</h2>
          <div class="inline-flex min-h-11 items-center gap-2.5 text-base">
            <MapPin class="size-[18px] shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <span>{{ t('store.footer.mansouraEgypt') }}</span>
          </div>
          <a v-if="settings.phone" :href="`tel:${settings.phone}`" :class="contactLinkClass">
            <Phone class="size-[18px] shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <span class="num font-semibold">{{ settings.phone }}</span>
          </a>
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            :class="contactLinkClass"
            @click="track('whatsapp_click', { source: 'footer' })"
          >
            <MessageCircle class="size-[18px] shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <span>{{ t('store.footer.chatOnWhatsapp') }}</span>
          </a>
        </div>
      </div>

      <div class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-serag-ivory/10 pt-6 text-sm">
        <span>© <span class="num">2026</span> {{ settings.name }}. {{ t('store.footer.allRightsReserved') }}</span>
        <NuxtLink
          :to="localePath('/')"
          class="font-display text-lg text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          {{ t('store.footer.legacyTagline') }} · <span class="font-extrabold">{{ t('store.footer.since') }}</span>
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
