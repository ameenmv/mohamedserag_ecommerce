<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { parseDate } from '@internationalized/date'
import { CalendarDays, X } from '@lucide/vue'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Date field with a calendar popover. The value is an ISO `YYYY-MM-DD` string, '' when empty. */
const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    min?: string
    max?: string
    class?: string
  }>(),
  { label: undefined, placeholder: undefined, min: undefined, max: undefined, class: undefined },
)

const modelValue = defineModel<string>({ default: '' })
const { t, locale } = useI18n()
const open = ref(false)

function toDate(value: string | undefined): DateValue | undefined {
  if (!value) return undefined
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const selected = computed(() => toDate(modelValue.value))
const display = computed(() => {
  const d = selected.value
  if (!d) return ''
  return new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(d.year, d.month - 1, d.day)))
})

function onSelect(value: DateValue | undefined): void {
  modelValue.value = value ? value.toString() : ''
  open.value = false
}
</script>

<template>
  <div :class="cn('flex min-w-0 flex-col gap-1', props.class)">
    <span v-if="label" class="text-[11px] font-bold text-muted-foreground">{{ label }}</span>
    <Popover v-model:open="open">
      <div class="relative">
        <PopoverTrigger as-child>
          <button
            type="button"
            :aria-label="label ?? placeholder"
            :class="cn(
              'border-input bg-background flex h-10 w-full items-center gap-2 rounded-xl border ps-3 pe-9 text-start text-xs shadow-xs transition-[color,box-shadow] outline-none',
              'hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
              open && 'border-ring ring-ring/50 ring-3',
            )"
          >
            <CalendarDays class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span :class="['num truncate', display ? 'text-foreground' : 'text-muted-foreground']">
              {{ display || placeholder || t('admin.form.pickDate') }}
            </span>
          </button>
        </PopoverTrigger>
        <button
          v-if="modelValue"
          type="button"
          class="absolute inset-y-0 end-2 my-auto grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :aria-label="t('admin.form.clearDate')"
          @click="onSelect(undefined)"
        >
          <X class="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <PopoverContent class="w-auto rounded-2xl p-0" align="start">
        <Calendar
          :model-value="selected"
          :locale="locale === 'ar' ? 'ar-EG' : 'en-GB'"
          :dir="locale === 'ar' ? 'rtl' : 'ltr'"
          :min-value="toDate(min)"
          :max-value="toDate(max)"
          initial-focus
          @update:model-value="onSelect"
        />
      </PopoverContent>
    </Popover>
  </div>
</template>
