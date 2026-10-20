<script setup lang="ts">
import { Check, MessageCircle } from '@lucide/vue'

defineProps<{
  badge: string
  title: string
  subtitle: string
  points: readonly string[]
  whatsappHref: string
  whatsappDisabled: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <header class="relative overflow-hidden rounded-[var(--radius-card)] bg-serag-night px-5 py-10 text-serag-ivory sm:px-8 sm:py-14 lg:px-12 lg:py-16">
    <div class="mx-auto flex max-w-3xl flex-col items-start gap-4">
      <span class="inline-flex items-center rounded-full bg-serag-gold/15 px-4 py-1.5 text-xs font-bold tracking-wide text-serag-gold-hi">
        {{ badge }}
      </span>

      <h1 class="font-display text-3xl leading-tight text-serag-ivory sm:text-4xl lg:text-5xl">
        {{ title }}
      </h1>

      <p class="max-w-2xl text-sm leading-relaxed text-serag-ivory/85 sm:text-base">
        {{ subtitle }}
      </p>

      <ul v-if="points.length" class="mt-1 flex flex-col gap-2">
        <li
          v-for="point in points"
          :key="point"
          class="flex items-center gap-2.5 text-sm font-semibold text-serag-ivory/95 sm:text-base"
        >
          <Check class="size-5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
          <span>{{ point }}</span>
        </li>
      </ul>

      <div class="mt-3 flex flex-col items-start gap-2">
        <a
          v-if="!whatsappDisabled"
          :href="whatsappHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-serag-gold px-6 text-base font-bold text-serag-night transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold-hi focus-visible:outline-none motion-reduce:transition-none"
        >
          <MessageCircle class="size-5" aria-hidden="true" />
          <span>{{ t('store.traders.whatsappCta') }}</span>
        </a>
        <button
          v-else
          type="button"
          disabled
          class="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-serag-gold/40 px-6 text-base font-bold text-serag-night/70"
        >
          <MessageCircle class="size-5" aria-hidden="true" />
          <span>{{ t('store.traders.whatsappCta') }}</span>
        </button>
        <p v-if="whatsappDisabled" class="max-w-sm text-xs text-serag-ivory/70">
          {{ t('store.traders.whatsappUnavailable') }}
        </p>
      </div>
    </div>
  </header>
</template>
