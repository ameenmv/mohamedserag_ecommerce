<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div
    role="alert"
    class="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
  >
    <slot>{{ message }}</slot>
  </div>
</template>
