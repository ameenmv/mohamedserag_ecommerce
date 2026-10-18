<script setup lang="ts">
import { ArrowLeft, Clock } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
const { lastToken } = useBridalDevice()
const hydrated = useHydrated()
</script>

<template>
  <div
    v-if="hydrated && lastToken"
    class="mb-8 rounded-2xl border border-serag-gold/40 bg-serag-gold/10 p-4 sm:p-5 shadow-sm"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-serag-gold/20 text-serag-night dark:text-serag-gold">
          <Clock class="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-foreground sm:text-base">
            {{ t('store.bridal.continueBanner.title') }}
          </h2>
          <p class="text-xs text-muted-foreground">
            {{ t('store.bridal.continueBanner.hint') }}
          </p>
        </div>
      </div>

      <NuxtLink
        :to="localePath(`/bridal/${lastToken}`)"
        class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 text-sm font-bold text-serag-ivory shadow transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
      >
        <span>{{ t('store.bridal.continueBanner.action') }}</span>
        <ArrowLeft class="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>
