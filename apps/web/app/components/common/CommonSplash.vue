<script setup lang="ts">
/**
 * Two splash designs, CSS only (main.css, "Splash"). Rendered with hydrate-never (app.vue), so
 * nothing here ships as JavaScript: decorative, never takes taps, skipped for reduced motion and
 * after the first page of a visit.
 *  - shutter: the shop's rolling metal shutter, logo painted on it, lifts to open the store.
 *  - word: the name in huge outlined letters fills with colour, then the panel lifts on a curve.
 */
withDefaults(defineProps<{ variant?: 'shutter' | 'word' }>(), { variant: 'shutter' })

const { t } = useI18n()
// The counter runs from the founding year to this one
const year = new Date().getFullYear()
</script>

<template>
  <div
    v-if="variant === 'shutter'"
    class="splash sp-shutter pointer-events-none fixed inset-0 z-[100] flex-col items-center justify-center text-serag-ivory"
    aria-hidden="true"
  >
    <div class="sp-shutter-shine absolute inset-0" />
    <div class="relative w-[260px] sm:w-[420px]" dir="ltr">
      <div class="flex items-center gap-[4.8%]">
        <svg class="splash-mark aspect-[268/260] w-[26.4%]" focusable="false"><use href="#brand-mark" /></svg>
        <svg class="splash-wordmark aspect-[688/267] w-[67.8%]" focusable="false"><use href="#brand-wordmark" /></svg>
      </div>
    </div>
    <div class="sp-year num relative mt-8 text-[56px] leading-none font-extrabold text-serag-gold-hi sm:text-[88px]" :style="{ '--sp-to': year }" />
    <div class="sp-rule relative mt-4 h-px w-40 bg-serag-gold/60 sm:w-56" />
    <!-- The bottom rail of the shutter, with its lock -->
    <div class="sp-rail absolute inset-x-0 bottom-0 flex h-4 items-center justify-center bg-serag-gold shadow-[0_18px_36px_rgba(0,0,0,.45)]">
      <span class="h-2 w-14 rounded-full bg-serag-gold-ink/70" />
    </div>
  </div>

  <div
    v-else
    class="splash sp-word pointer-events-none fixed inset-0 z-[100] flex-col items-center justify-center bg-serag-cream"
    aria-hidden="true"
  >
    <div class="relative font-display text-[clamp(120px,30vw,360px)] leading-[1.1]">
      <span class="text-outline block [--outline-color:var(--color-serag-gold)]">{{ t('common.splash.word') }}</span>
      <span class="sp-word-fill absolute inset-0 block text-serag-night [-webkit-text-stroke:2px_var(--color-serag-night)]">{{ t('common.splash.word') }}</span>
    </div>
    <div class="sp-word-since mt-2 flex items-center gap-3 text-lg font-bold text-serag-gold-ink sm:text-2xl">
      <svg class="aspect-[268/260] w-8 sm:w-10" focusable="false"><use href="#brand-mark" /></svg>
      {{ t('common.splash.since') }}
    </div>
  </div>
</template>
