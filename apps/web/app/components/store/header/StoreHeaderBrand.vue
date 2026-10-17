<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/')"
    class="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:gap-3"
  >
    <div
      class="num flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold tracking-tight text-serag-gold-hi ring-2 ring-serag-gold/40 ring-inset sm:size-12 sm:text-xl"
      aria-hidden="true"
    >
      MS
    </div>
    <div class="flex flex-col leading-none">
      <span class="font-display text-2xl text-primary sm:text-3xl">{{ t('brand.name') }}</span>
      <span
        aria-hidden="true"
        class="num mt-0.5 text-[10px] font-bold tracking-widest text-serag-gold-ink sm:text-[11px] dark:text-serag-gold-hi"
      >
        SINCE 1972
      </span>
    </div>
  </NuxtLink>
</template>
