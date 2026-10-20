<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    open?: boolean
  }>(),
  {
    open: true,
  },
)
</script>

<template>
  <details :open="open" class="group border-b border-border/80 py-3.5">
    <summary
      class="flex cursor-pointer list-none items-center justify-between rounded-lg py-1 text-sm font-bold text-foreground transition-colors hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{{ title }}</span>
      <ChevronDown
        class="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </summary>
    <div class="mt-2.5">
      <slot />
    </div>
  </details>
</template>
