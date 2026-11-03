<script setup lang="ts">
import { MessageCircle, Phone } from '@lucide/vue'
import { hasPlaceholder, waLink, type PublicStoreInfo } from '@serag/shared'

const props = defineProps<{
  storeInfo: PublicStoreInfo | null | undefined
}>()

const { t } = useI18n()

const whatsappNumber = computed(() => {
  const info = props.storeInfo
  if (!info) return ''
  if (!hasPlaceholder(info.whatsapp)) return info.whatsapp
  if (!hasPlaceholder(info.tradersWhatsapp)) return info.tradersWhatsapp
  return ''
})

const phoneNumber = computed(() => {
  const info = props.storeInfo
  if (!info) return ''
  if (!hasPlaceholder(info.phone)) return info.phone
  return ''
})

const whatsappHref = computed(() =>
  whatsappNumber.value ? waLink(whatsappNumber.value, t('store.faq.whatsappMessage')) : '',
)

const phoneHref = computed(() =>
  phoneNumber.value ? `tel:${phoneNumber.value}` : '',
)

const hasAnyContact = computed(() => Boolean(whatsappNumber.value || phoneNumber.value))
</script>

<template>
  <aside
    v-if="hasAnyContact"
    class="relative mx-auto mt-12 w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-xs sm:mt-16 sm:p-10"
    :aria-label="t('store.faq.contactCard.title')"
  >
    <!-- Subtle gold top accent line -->
    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-serag-gold to-transparent" aria-hidden="true" />

    <h2 class="font-display text-2xl font-black text-foreground sm:text-3xl">
      {{ t('store.faq.contactCard.title') }}
    </h2>

    <p class="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
      {{ t('store.faq.contactCard.description') }}
    </p>

    <div class="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
      <a
        v-if="whatsappHref"
        :href="whatsappHref"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
      >
        <MessageCircle class="size-5" aria-hidden="true" />
        <span>{{ t('store.faq.contactCard.whatsappButton') }}</span>
      </a>

      <a
        v-if="phoneHref"
        :href="phoneHref"
        class="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-bold text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
      >
        <Phone class="size-5 text-serag-green dark:text-serag-gold" aria-hidden="true" />
        <span class="num" dir="ltr">{{ phoneNumber }}</span>
      </a>
    </div>
  </aside>
</template>
