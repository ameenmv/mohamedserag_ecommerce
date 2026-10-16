<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-3 mb-2">
    <div
      class="size-12 rounded-2xl bg-serag-green flex items-center justify-center font-num font-extrabold text-xl text-serag-gold-hi shadow-[inset_0_0_0_2px_rgba(210,194,122,0.45)]"
    >
      MS
    </div>
    <div class="flex flex-col leading-tight">
      <span class="font-display text-2xl text-serag-green">{{ t('brand.name') }}</span>
      <span class="font-num text-[11px] font-bold tracking-[3px] text-serag-gold-ink">
        ADMIN PORTAL
      </span>
    </div>
  </div>
</template>
