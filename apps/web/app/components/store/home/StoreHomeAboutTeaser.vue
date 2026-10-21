<script setup lang="ts">
import { ArrowRight, Store } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['aboutTeaser']
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const cta = computed(() => {
  const c = props.content.cta
  if (!c) return null
  return {
    to: isInternalHref(c.href) ? localePath(c.href) : c.href,
    external: isExternalHref(c.href),
    label: c.label,
  }
})

const headingId = useId()
</script>

<template>
  <section
    class="relative overflow-hidden bg-serag-cream"
    :aria-labelledby="headingId"
  >
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div class="relative min-w-0 flex-1 basis-96">
        <div
          class="flex min-h-96 flex-col items-center justify-center gap-4 rounded-[200px_200px_40px_40px] border-2 border-serag-gold bg-gradient-to-br from-serag-deep to-serag-green p-8 text-center text-serag-ivory"
        >
          <Store class="size-20 text-serag-gold-hi" aria-hidden="true" />
          <p class="font-display text-3xl text-serag-gold-hi">
            {{ t('store.home.showroomName') }}
          </p>
          <p class="max-w-64 text-sm leading-relaxed text-serag-ivory/70">
            {{ t('store.home.showroomLine') }}
          </p>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 basis-96 flex-col gap-6">
        <p class="text-xs font-bold tracking-[0.25em] text-serag-gold-ink uppercase">
          {{ content.eyebrow }}
        </p>
        <h2
          :id="headingId"
          class="font-display text-4xl leading-none text-serag-green sm:text-5xl"
        >
          {{ content.title }}
        </h2>
        <p class="text-lg leading-relaxed text-serag-ink/80">{{ content.subtitle }}</p>
        <NuxtLink
          v-if="cta"
          :to="cta.to"
          :target="cta.external ? '_blank' : undefined"
          :rel="cta.external ? 'noopener noreferrer' : undefined"
          class="inline-flex min-h-11 items-center gap-3 self-start rounded-full border border-serag-green px-7 py-3 text-base font-bold text-serag-green transition-colors hover:bg-serag-green hover:text-serag-ivory focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ cta.label }}
          <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
