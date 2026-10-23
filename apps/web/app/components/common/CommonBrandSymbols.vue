<script setup lang="ts">
import { LOGO_GREEN, LOGO_PATHS, LOGO_VIEWBOX } from '~/constants/brand-logo'
</script>

<template>
  <!-- Rendered with hydrate-never (app.vue): the path data ships in the HTML once and never in JS.
       The name inherits the <use> element's text colour (black on light, ivory on dark). -->
  <svg width="0" height="0" class="absolute" aria-hidden="true" focusable="false">
    <symbol id="brand-mark" :viewBox="LOGO_VIEWBOX.mark">
      <rect width="536" height="520" :fill="LOGO_GREEN" />
      <path :d="LOGO_PATHS.markLetters" fill="#fff" />
    </symbol>
    <symbol id="brand-wordmark" :viewBox="LOGO_VIEWBOX.wordmark">
      <path :d="LOGO_PATHS.wordmarkName" fill="currentColor" />
      <path :d="LOGO_PATHS.wordmarkGreen" :fill="LOGO_GREEN" />
    </symbol>
    <symbol id="brand-since" :viewBox="LOGO_VIEWBOX.since">
      <path :d="LOGO_PATHS.since" :fill="LOGO_GREEN" />
    </symbol>
  </svg>
</template>
