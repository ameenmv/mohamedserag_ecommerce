<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Compact shadcn Select for filter bars; options are `{ value, label }` (values must not be ''). */
const props = defineProps<{
  options: readonly { value: string; label: string }[]
  label: string
  /** Value that means "no filter": the trigger is then shown muted */
  neutral?: string
  class?: string
}>()

const modelValue = defineModel<string>({ required: true })
const isActive = computed(() => props.neutral !== undefined && modelValue.value !== props.neutral)
</script>

<template>
  <Select v-model="modelValue">
    <SelectTrigger
      :aria-label="label"
      :class="cn(
        'h-10 w-full rounded-xl text-xs',
        isActive && 'border-serag-gold/70 bg-serag-gold/10 font-bold',
        props.class,
      )"
    >
      <SelectValue :placeholder="label" />
    </SelectTrigger>
    <SelectContent class="rounded-xl">
      <SelectItem v-for="o in options" :key="o.value" :value="o.value" class="text-xs">
        {{ o.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
