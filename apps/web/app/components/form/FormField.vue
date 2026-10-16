<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

defineProps<{
  id: string
  label: string
  error?: string
  labelClass?: HTMLAttributes['class']
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <Label :for="id" :class="cn('text-sm font-semibold', labelClass)">
      {{ label }}
    </Label>
    <slot
      :id="id"
      :error="error"
      :invalid="Boolean(error)"
      :described-by="error ? `${id}-error` : undefined"
    />
    <p
      v-if="error"
      :id="`${id}-error`"
      class="text-xs font-medium text-destructive"
    >
      {{ error }}
    </p>
  </div>
</template>
