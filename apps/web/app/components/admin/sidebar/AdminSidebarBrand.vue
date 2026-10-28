<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3 px-2">
    <img src="/brand/mark.webp" alt="" width="240" height="233" class="size-12 shrink-0 rounded-xl">
    <div class="leading-none">
      <div class="font-display text-2xl text-sidebar-accent-foreground">
        {{ t('brand.name') }}
      </div>
      <div class="num mt-1 text-[11px] font-semibold tracking-widest text-sidebar-primary">
        ADMIN · SINCE 1972
      </div>
    </div>
  </div>
</template>
