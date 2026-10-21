<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    class: undefined,
  },
)

const modelValue = defineModel<string | number>({ default: '' })
</script>

<template>
  <div class="relative w-full">
    <select
      v-model="modelValue"
      v-bind="$attrs"
      :disabled="disabled"
      :class="cn(
        'border-input h-10 w-full appearance-none rounded-md border bg-background ps-3 pe-8 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        props.class,
      )"
    >
      <slot />
    </select>
    <div
      class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2.5 text-muted-foreground"
      aria-hidden="true"
    >
      <ChevronDown class="size-4 opacity-60" />
    </div>
  </div>
</template>
