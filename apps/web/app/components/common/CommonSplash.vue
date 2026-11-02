<script setup lang="ts">
/**
 * Storefront splash screen: premium opening greeting the first visit of a session.
 * CSS only (main.css, "Splash"), rendered with hydrate-never (app.vue) so zero JS ships.
 */
const { t } = useI18n()
</script>

<template>
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    aria-hidden="true"
  >
    <!-- Top and bottom curtain halves that part on exit -->
    <div class="splash-curtain-top" />
    <div class="splash-curtain-bottom" />

    <!-- Center brand showcase -->
    <div class="splash-content relative z-10 flex flex-col items-center text-center">
      <svg class="splash-mark aspect-[268/260] w-16 sm:w-[84px]" focusable="false">
        <use href="#brand-mark" />
      </svg>
      <div class="splash-wordmark-wrap relative mt-5 sm:mt-6">
        <svg class="splash-wordmark aspect-[688/267] w-[200px] text-serag-ivory sm:w-[300px]" focusable="false">
          <use href="#brand-wordmark" />
        </svg>
      </div>
      <div class="splash-rule mt-4 h-px w-[120px] bg-serag-gold/60 sm:mt-5 sm:w-[180px]" />
      <p class="splash-caption mt-3 text-[13px] font-medium tracking-[.3em] text-serag-gold-hi sm:text-[15px]">
        {{ t('common.splash.since') }}
      </p>
    </div>
  </div>
</template>
