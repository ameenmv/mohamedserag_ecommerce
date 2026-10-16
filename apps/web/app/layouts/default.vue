<script setup lang="ts">
import StoreHeader from '@/components/store/StoreHeader.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background pb-20 text-foreground md:pb-0">
    <a
      href="#store-main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-bold focus:text-accent-foreground focus:shadow-lg"
    >
      {{ t('common.skipToContent') }}
    </a>

    <StoreHeader />

    <div id="store-main-content" tabindex="-1" class="flex-1 outline-none">
      <slot />
    </div>

    <LazyStoreFooter hydrate-on-visible />
    <LazyStoreBottomNav hydrate-on-idle />
  </div>
</template>
