<script setup lang="ts">
import { Sparkles } from '@lucide/vue'

defineProps<{
  to: string
  label: string
  isActive: boolean
  highlight?: boolean
}>()

const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath(to)"
    :aria-current="isActive ? 'page' : undefined"
    :class="[
      'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
      isActive
        ? 'bg-primary text-primary-foreground'
        : highlight
          ? 'bg-secondary text-serag-gold-ink hover:bg-accent hover:text-accent-foreground dark:text-serag-gold-hi'
          : 'text-foreground hover:bg-secondary',
    ]"
  >
    <Sparkles v-if="highlight" class="size-4" aria-hidden="true" />
    <span>{{ label }}</span>
  </NuxtLink>
</template>
