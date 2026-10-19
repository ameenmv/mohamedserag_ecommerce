<script setup lang="ts">
import { DEFAULT_HOME_CONTENT, hasPlaceholder, waLink } from '@serag/shared'

const { t } = useI18n()
const storeApi = useStoreApi()

const { data: home } = await useAsyncData('traders:home', () => storeApi.home())
const { data: store } = await useAsyncData('traders:store', () => storeApi.storeInfo())

const teaser = computed(
  () => home.value?.sections.tradersTeaser ?? DEFAULT_HOME_CONTENT.tradersTeaser,
)

useSeoMeta({
  title: () => t('store.traders.seoTitle'),
  description: () => t('store.traders.seoDescription'),
})

const tradersNumber = computed(() => {
  const info = store.value
  if (!info) return ''
  if (!hasPlaceholder(info.tradersWhatsapp)) return info.tradersWhatsapp
  if (!hasPlaceholder(info.whatsapp)) return info.whatsapp
  return ''
})

const whatsappHref = computed(() =>
  tradersNumber.value ? waLink(tradersNumber.value, t('store.traders.whatsappMessage')) : '',
)

const contact = computed(() => {
  const info = store.value
  return {
    phone: info && !hasPlaceholder(info.phone) ? info.phone : '',
    address: info && !hasPlaceholder(info.address) ? info.address : '',
    hours: info && !hasPlaceholder(info.hours) ? info.hours : '',
  }
})
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <div class="flex flex-col gap-6 sm:gap-8">
      <StoreTradersHero
        :badge="teaser.badge"
        :title="teaser.title"
        :subtitle="teaser.subtitle"
        :points="teaser.points"
        :whatsapp-href="whatsappHref"
        :whatsapp-disabled="tradersNumber.length === 0"
      />

      <StoreTradersSteps />

      <StoreTradersContact
        :phone="contact.phone"
        :address="contact.address"
        :hours="contact.hours"
      />
    </div>
  </main>
</template>
