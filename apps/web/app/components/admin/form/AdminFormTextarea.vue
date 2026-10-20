<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    rows?: number
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    rows: 3,
    class: undefined,
  },
)

const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    v-model="modelValue"
    v-bind="$attrs"
    :rows="rows"
    :disabled="disabled"
    :class="cn(
      'border-input placeholder:text-muted-foreground w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      props.class,
    )"
  />
</template>
