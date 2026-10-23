<template>
  <!-- Plays on every full page load (main.css); decorative, never takes taps, skipped for reduced motion -->
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] items-center justify-center bg-white"
    aria-hidden="true"
  >
    <div class="splash-glow absolute size-[520px] rounded-full" />
    <!-- Proportions of the original logo: square 268, gap 49, wordmark 688, total 1014 -->
    <div class="relative w-[300px] sm:w-[460px]" dir="ltr">
      <div class="flex items-center gap-[4.8%]">
        <div class="splash-mark aspect-[240/233] w-[26.4%] rounded-[3px] bg-contain bg-no-repeat" />
        <div class="splash-wordmark aspect-[688/267] w-[67.8%] bg-contain bg-no-repeat" />
      </div>
      <div class="splash-since mx-auto mt-[5.2%] aspect-[440/25] w-[72.2%] bg-contain bg-no-repeat" />
    </div>
  </div>
</template>
