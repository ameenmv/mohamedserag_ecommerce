<script setup lang="ts">
import { Check } from '@lucide/vue'

defineProps<{
  text?: string
}>()
</script>

<template>
  <li class="flex items-center gap-3">
    <span
      class="size-8 rounded-full bg-serag-gold/20 text-serag-gold-hi flex items-center justify-center shrink-0"
    >
      <Check class="size-4" aria-hidden="true" />
    </span>
    <span><slot>{{ text }}</slot></span>
  </li>
</template>
