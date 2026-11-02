<script setup lang="ts">
/**
 * Storefront splash screen: the four appliance cards drop into a deck, fan out,
 * show the brand marks, then fly into the hero art positions as the background fades.
 * CSS only (main.css, "Splash"), rendered with hydrate-never (app.vue) so zero JS ships.
 */
const { t } = useI18n()
</script>

<template>
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    aria-hidden="true"
  >
    <!-- Center brand showcase: rises above the fan, fades before landing fly -->
    <div class="splash-logo absolute flex flex-col items-center text-center">
      <svg class="splash-mark aspect-[268/260] w-14 lg:w-[72px]" focusable="false">
        <use href="#brand-mark" />
      </svg>
      <div class="splash-wordmark-wrap mt-3.5 lg:mt-5">
        <svg class="splash-wordmark aspect-[688/267] w-[170px] text-serag-ivory lg:w-[220px]" focusable="false">
          <use href="#brand-wordmark" />
        </svg>
      </div>
    </div>

    <!-- Cards deck: drops, fans out, flies into hero, fades in the final 20% of landing -->
    <div class="splash-deck relative flex items-center justify-center">
      <!-- 1. Fridge -->
      <div class="splash-card splash-card-1 border border-serag-gold-hi/55 bg-gradient-to-b from-[#4F7F1B] to-[#1B3526] text-serag-gold-hi">
        <svg viewBox="0 0 48 48" class="w-[46%]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="13" y="4" width="22" height="40" rx="3" />
          <path d="M13 20h22M18 10v6M18 25v8" />
        </svg>
        <span class="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-serag-ivory sm:text-sm">
          {{ t('store.home.heroArt.fridges') }}
        </span>
      </div>

      <!-- 2. Washer -->
      <div class="splash-card splash-card-2 border border-[#E4DDC6] bg-serag-ivory text-serag-green">
        <svg viewBox="0 0 48 48" class="w-[46%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="4" width="30" height="40" rx="4" />
          <circle cx="24" cy="28" r="10" />
          <circle cx="24" cy="28" r="5" />
          <path d="M15 11h8M31 11h2" />
        </svg>
        <span class="text-xs font-bold sm:text-sm">
          {{ t('store.home.heroArt.washers') }}
        </span>
      </div>

      <!-- 3. Screen -->
      <div class="splash-card splash-card-3 bg-serag-gold text-serag-ink">
        <svg viewBox="0 0 48 48" class="w-[46%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="8" width="40" height="27" rx="3" />
          <path d="M16 42h16M24 35v7" />
        </svg>
        <span class="text-xs font-bold sm:text-sm">
          {{ t('store.home.heroArt.screens') }}
        </span>
      </div>

      <!-- 4. AC -->
      <div class="splash-card splash-card-4 border border-[#44413a] bg-[#2d2c29] text-serag-ivory">
        <svg viewBox="0 0 48 48" class="w-[46%]" fill="none" stroke="var(--color-serag-gold-hi)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="10" width="40" height="16" rx="3" />
          <path d="M10 21h28M14 32c2 3 2 5 0 8M24 32c2 3 2 5 0 8M34 32c2 3 2 5 0 8" />
        </svg>
        <span class="text-xs font-bold sm:text-sm">
          {{ t('store.home.heroArt.acs') }}
        </span>
      </div>
    </div>
  </div>
</template>
