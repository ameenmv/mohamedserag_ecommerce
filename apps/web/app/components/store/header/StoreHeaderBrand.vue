<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex shrink-0 items-center rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <!-- The store's own logo, vector (CommonBrandLogo); the Arabic name turns ivory in dark mode -->
    <CommonBrandLogo class="h-11 text-black sm:h-[60px] dark:text-serag-ivory" />
  </NuxtLink>
</template>
