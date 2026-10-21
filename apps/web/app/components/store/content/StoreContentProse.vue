<script setup lang="ts">
defineProps<{
  html: string
}>()
</script>

<template>
  <!-- API output is sanitized to the page/guide allowlist (sanitize-html) before it reaches `v-html`. -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    dir="auto"
    class="store-content-prose max-w-[65ch] text-base leading-relaxed text-foreground/90 [&_a]:break-words [&_a]:font-semibold [&_a]:text-serag-green [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-serag-gold [&_blockquote]:my-4 [&_blockquote]:border-s-4 [&_blockquote]:border-serag-gold/60 [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_em]:italic [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-foreground [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-foreground [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-3 [&_strong]:font-bold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
