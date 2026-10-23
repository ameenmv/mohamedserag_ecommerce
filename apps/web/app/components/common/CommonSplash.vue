<script setup lang="ts">
import { LOGO_GREEN, LOGO_PATHS, LOGO_VIEWBOX } from '~/constants/brand-logo'
</script>

<template>
  <!-- Plays on every full page load (main.css); decorative, never takes taps, skipped for reduced motion.
       The logo is inline vector art (constants/brand-logo.ts), so it paints with the first frame. -->
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] items-center justify-center bg-white"
    aria-hidden="true"
  >
    <div class="splash-glow absolute size-[520px] rounded-full" />
    <!-- Proportions of the original logo: square 268, gap 49, wordmark 688, total 1014 -->
    <div class="relative w-[300px] sm:w-[460px]" dir="ltr">
      <div class="flex items-center gap-[4.8%]">
        <svg class="splash-mark w-[26.4%]" :viewBox="LOGO_VIEWBOX.mark" focusable="false">
          <rect width="804" height="780" :fill="LOGO_GREEN" />
          <path :d="LOGO_PATHS.markLetters" fill="#fff" />
        </svg>
        <svg class="splash-wordmark w-[67.8%]" :viewBox="LOGO_VIEWBOX.wordmark" focusable="false">
          <path :d="LOGO_PATHS.wordmarkName" fill="#000" />
          <path :d="LOGO_PATHS.wordmarkGreen" :fill="LOGO_GREEN" />
        </svg>
      </div>
      <svg class="splash-since mx-auto mt-[5.2%] block w-[72.2%]" :viewBox="LOGO_VIEWBOX.since" focusable="false">
        <path :d="LOGO_PATHS.since" :fill="LOGO_GREEN" />
      </svg>
    </div>
  </div>
</template>
