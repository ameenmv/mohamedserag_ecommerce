<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  to: string
  label: string
  count: number
  icon: Component
}>()

const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath(to)"
    :aria-label="label"
    class="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
  >
    <component :is="icon" class="size-5" aria-hidden="true" />
    <span
      class="num absolute -top-1.5 -start-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
    >
      {{ count }}
    </span>
  </NuxtLink>
</template>
