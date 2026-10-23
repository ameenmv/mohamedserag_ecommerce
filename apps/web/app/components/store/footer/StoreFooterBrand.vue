<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <img
      src="/brand/logo-light.webp"
      :alt="t('brand.storeName')"
      width="480"
      height="172"
      loading="lazy"
      class="h-20 w-auto self-start"
    >
    <p class="max-w-sm text-base leading-[1.8]">
      {{ t('store.footer.brandDescription') }}
    </p>
    <div class="inline-flex items-center gap-2 text-xs text-serag-gold-hi">
      <ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ t('store.footer.vatNotice') }}</span>
    </div>
  </div>
</template>
