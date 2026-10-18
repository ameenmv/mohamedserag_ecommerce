<script setup lang="ts">
defineProps<{
  title: string
  options: readonly { value: string; label: string; count?: number }[]
  selected: readonly string[]
}>()

const emit = defineEmits<{
  toggle: [value: string]
}>()
</script>

<template>
  <fieldset class="flex flex-col gap-0.5">
    <legend class="sr-only">{{ title }}</legend>
    <label
      v-for="opt in options"
      :key="opt.value"
      class="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-secondary/60"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <input
          type="checkbox"
          :checked="selected.includes(opt.value)"
          class="size-4.5 cursor-pointer rounded-sm border-input accent-serag-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:accent-serag-gold"
          @change="emit('toggle', opt.value)"
        >
        <span class="truncate font-medium text-foreground">{{ opt.label }}</span>
      </div>
      <span
        v-if="opt.count !== undefined"
        class="num text-xs font-semibold text-muted-foreground"
      >
        ({{ opt.count }})
      </span>
    </label>
  </fieldset>
</template>
