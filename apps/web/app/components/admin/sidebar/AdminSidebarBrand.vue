<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3 px-2">
    <div
      class="font-display flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary pb-1 text-3xl leading-none text-sidebar-primary-foreground"
      aria-hidden="true"
    >
      س
    </div>
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
