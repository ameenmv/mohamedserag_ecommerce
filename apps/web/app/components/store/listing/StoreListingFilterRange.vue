<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    minPlaceholder?: string
    maxPlaceholder?: string
    unit?: string
    minLabel?: string
    maxLabel?: string
  }>(),
  {
    min: undefined,
    max: undefined,
    minPlaceholder: '0',
    maxPlaceholder: '',
    unit: undefined,
    minLabel: undefined,
    maxLabel: undefined,
  },
)

const emit = defineEmits<{
  change: [range: { min?: number; max?: number }]
}>()

const { t } = useI18n()
const minId = useId()
const maxId = useId()

const localMin = ref<string>(props.min !== undefined ? String(props.min) : '')
const localMax = ref<string>(props.max !== undefined ? String(props.max) : '')

watch(
  () => [props.min, props.max],
  ([newMin, newMax]) => {
    localMin.value = newMin !== undefined ? String(newMin) : ''
    localMax.value = newMax !== undefined ? String(newMax) : ''
  },
)

const emitDebounced = useDebounceFn(() => {
  applyChange()
}, 500)

function applyChange() {
  const minTrimmed = localMin.value.trim()
  const maxTrimmed = localMax.value.trim()

  const minParsed =
    minTrimmed !== '' && !Number.isNaN(Number(minTrimmed))
      ? Number(minTrimmed)
      : undefined
  const maxParsed =
    maxTrimmed !== '' && !Number.isNaN(Number(maxTrimmed))
      ? Number(maxTrimmed)
      : undefined

  if (minParsed !== props.min || maxParsed !== props.max) {
    emit('change', { min: minParsed, max: maxParsed })
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Min Input -->
    <div class="flex-1">
      <label :for="minId" class="mb-1 block text-xs font-semibold text-muted-foreground">
        {{ minLabel ?? t('store.listing.fromPrice') }}
      </label>
      <div class="relative flex items-center">
        <input
          :id="minId"
          v-model="localMin"
          type="number"
          min="0"
          step="50"
          :placeholder="minPlaceholder"
          class="num min-h-11 w-full rounded-xl border border-input bg-background ps-3 pe-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @input="emitDebounced"
          @change="applyChange"
        >
        <span
          v-if="unit"
          class="pointer-events-none absolute end-2.5 text-xs text-muted-foreground"
        >
          {{ unit }}
        </span>
      </div>
    </div>

    <span class="mt-5 text-muted-foreground">-</span>

    <!-- Max Input -->
    <div class="flex-1">
      <label :for="maxId" class="mb-1 block text-xs font-semibold text-muted-foreground">
        {{ maxLabel ?? t('store.listing.upToPrice') }}
      </label>
      <div class="relative flex items-center">
        <input
          :id="maxId"
          v-model="localMax"
          type="number"
          min="0"
          step="50"
          :placeholder="maxPlaceholder"
          class="num min-h-11 w-full rounded-xl border border-input bg-background ps-3 pe-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @input="emitDebounced"
          @change="applyChange"
        >
        <span
          v-if="unit"
          class="pointer-events-none absolute end-2.5 text-xs text-muted-foreground"
        >
          {{ unit }}
        </span>
      </div>
    </div>
  </div>
</template>
