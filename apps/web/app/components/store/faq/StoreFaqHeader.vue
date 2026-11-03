<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <header class="flex flex-col items-center text-center">
    <h1 class="font-display text-3xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
      {{ title }}
    </h1>

    <!-- Thin gold hairline -->
    <div class="mt-4 h-0.5 w-16 rounded-full bg-serag-gold sm:mt-5" aria-hidden="true" />

    <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
      {{ subtitle }}
    </p>
  </header>
</template>
