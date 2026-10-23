<template>
  <!-- Plays on every full page load (main.css); decorative, never takes taps, skipped for reduced
       motion. Rendered with hydrate-never (app.vue); the logo parts are the shared SVG symbols. -->
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] items-center justify-center bg-[#fff] text-black"
    aria-hidden="true"
  >
    <div class="splash-glow absolute size-[520px] rounded-full" />
    <!-- Proportions of the original logo: square 268, gap 49, wordmark 688, total 1014 -->
    <div class="relative w-[300px] sm:w-[460px]" dir="ltr">
      <div class="flex items-center gap-[4.8%]">
        <svg class="splash-mark aspect-[268/260] w-[26.4%]" focusable="false"><use href="#brand-mark" /></svg>
        <svg class="splash-wordmark aspect-[688/267] w-[67.8%]" focusable="false"><use href="#brand-wordmark" /></svg>
      </div>
      <svg class="splash-since mx-auto mt-[5.2%] block aspect-[732/42] w-[72.2%]" focusable="false"><use href="#brand-since" /></svg>
    </div>
  </div>
</template>
