<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    id?: string
    ariaLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    id: undefined,
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
  <button
    :id="id"
    type="button"
    role="switch"
    v-bind="$attrs"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    :class="cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      modelValue ? 'bg-serag-green dark:bg-serag-gold' : 'bg-muted',
      props.class,
    )"
    @click="toggle"
    @keydown.space.prevent="toggle"
    @keydown.enter.prevent="toggle"
  >
    <span
      class="pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out"
      :class="modelValue ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>
