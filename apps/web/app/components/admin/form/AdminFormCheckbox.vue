<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Check } from '@lucide/vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    id?: string
    label?: string
    ariaLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    id: undefined,
    label: undefined,
    ariaLabel: undefined,
    class: undefined,
  },
)

const modelValue = defineModel<boolean>({ default: false })

function toggle() {
  if (props.disabled) return
  modelValue.value = !modelValue.value
}
</script>

<template>
  <label
    :for="id"
    :class="cn(
      'inline-flex items-center gap-2.5 text-sm font-medium select-none',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      props.class,
    )"
  >
    <button
      :id="id"
      type="button"
      role="checkbox"
      v-bind="$attrs"
      :aria-checked="modelValue"
      :aria-label="ariaLabel || label"
      :disabled="disabled"
      class="border-input flex size-5 shrink-0 items-center justify-center rounded-sm border bg-background shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="modelValue ? 'border-serag-green bg-serag-green text-white dark:border-serag-gold dark:bg-serag-gold dark:text-serag-ink' : ''"
      @click="toggle"
      @keydown.space.prevent="toggle"
      @keydown.enter.prevent="toggle"
    >
      <Check v-if="modelValue" class="size-3.5 stroke-[3]" aria-hidden="true" />
    </button>
    <span v-if="label || $slots.default">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
