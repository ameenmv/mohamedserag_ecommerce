<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <!-- The full logo lockup from the symbols in CommonBrandSymbols. Size it with a height class;
       the text colour sets the Arabic name's colour. Layout from the original logo (1014 × 364). -->
  <svg viewBox="0 0 1014 364" role="img" :aria-label="t('brand.storeName')" class="w-auto">
    <use href="#brand-mark" x="7" y="7" width="268" height="260" />
    <use href="#brand-wordmark" x="324" y="21" width="688" height="267" />
    <use href="#brand-since" x="138" y="320" width="732" height="42" />
  </svg>
</template>
