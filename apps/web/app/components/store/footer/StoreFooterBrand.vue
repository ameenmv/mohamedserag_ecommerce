<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3.5">
      <div
        class="num flex size-14 shrink-0 items-center justify-center rounded-2xl bg-serag-green text-2xl font-extrabold text-serag-gold-hi ring-2 ring-serag-gold/45 ring-inset"
        aria-hidden="true"
      >
        MS
      </div>
      <div class="leading-tight">
        <div class="font-display text-3xl text-serag-ivory">
          {{ t('brand.name') }}
        </div>
        <div class="num text-[11px] font-bold tracking-widest text-serag-gold-hi">
          SINCE 1972
        </div>
      </div>
    </div>
    <p class="max-w-sm text-base leading-[1.8]">
      {{ t('store.footer.brandDescription') }}
    </p>
    <div class="inline-flex items-center gap-2 text-xs text-serag-gold-hi">
      <ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ t('store.footer.vatNotice') }}</span>
    </div>
  </div>
</template>
