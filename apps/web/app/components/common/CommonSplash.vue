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

    <!-- Cards deck: drops, fans out, flies into hero, morphs/lands on matching hero card -->
    <div class="splash-deck">
      <!-- 1. Fridge -->
      <div data-splash-card="fridges" class="splash-card splash-card-1 gap-4 border border-serag-gold-hi/55 bg-gradient-to-b from-[#4F7F1B] to-[#1B3526] text-serag-gold-hi">
        <svg viewBox="0 0 48 48" class="w-[64%]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="13" y="4" width="22" height="40" rx="3" />
          <path d="M13 20h22M18 10v6M18 25v8" />
        </svg>
        <span class="rounded-full bg-black/30 px-4 py-1.5 text-sm font-bold text-serag-ivory sm:text-base">
          {{ t('store.home.heroArt.fridges') }}
        </span>
      </div>

      <!-- 2. Washer -->
      <div data-splash-card="washers" class="splash-card splash-card-2 gap-3 border border-[#E4DDC6] bg-serag-ivory text-serag-green">
        <svg viewBox="0 0 48 48" class="w-[56%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="4" width="30" height="40" rx="4" />
          <circle cx="24" cy="28" r="10" />
          <circle cx="24" cy="28" r="5" />
          <path d="M15 11h8M31 11h2" />
        </svg>
        <span class="text-sm font-bold sm:text-[15px]">
          {{ t('store.home.heroArt.washers') }}
        </span>
      </div>

      <!-- 3. Screen -->
      <div data-splash-card="screens" class="splash-card splash-card-3 gap-2.5 bg-serag-gold text-serag-ink">
        <svg viewBox="0 0 48 48" class="w-[62%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="8" width="40" height="27" rx="3" />
          <path d="M16 42h16M24 35v7" />
        </svg>
        <span class="text-sm font-bold sm:text-[15px]">
          {{ t('store.home.heroArt.screens') }}
        </span>
      </div>

      <!-- 4. AC -->
      <div data-splash-card="acs" class="splash-card splash-card-4 gap-2 border border-serag-ivory/25 bg-serag-ivory/8 text-serag-ivory backdrop-blur-sm">
        <svg viewBox="0 0 48 48" class="w-1/2" fill="none" stroke="var(--color-serag-gold-hi)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
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
