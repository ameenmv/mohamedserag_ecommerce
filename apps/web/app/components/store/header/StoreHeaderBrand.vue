<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex shrink-0 items-center rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <!-- The store's own logo (public/brand, built from public/logo.jpg) -->
    <img
      src="/brand/logo.webp"
      :alt="t('brand.storeName')"
      width="480"
      height="172"
      class="h-11 w-auto sm:h-[60px]"
    >
  </NuxtLink>
</template>
