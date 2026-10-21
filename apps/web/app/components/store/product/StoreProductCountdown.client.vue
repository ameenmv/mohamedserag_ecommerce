<script setup lang="ts">
import { Clock } from '@lucide/vue'
import { formatDateTime } from '~/utils/date-format'
import { formatCountdownClock, getCountdownSplit } from '~/utils/countdown'

const props = withDefaults(
  defineProps<{
    endsAt: string | Date
    variant?: 'compact' | 'detail'
  }>(),
  {
    variant: 'compact',
  },
)

const emit = defineEmits<{
  (e: 'ended'): void
}>()

const { t, locale } = useI18n()

const now = ref(Date.now())
const hasEmittedEnded = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const split = computed(() => getCountdownSplit(props.endsAt, now.value))

const staticLabel = computed(() =>
  t('store.flash.endsAtAria', {
    datetime: formatDateTime(props.endsAt, locale.value),
  }),
)

const digitsText = computed(() => {
  const clock = formatCountdownClock(split.value)
  return split.value.days >= 1
    ? t('store.flash.daysAndClock', { days: split.value.days, clock })
    : clock
})

const displayText = computed(() => {
  if (props.variant === 'detail') {
    return t('store.flash.endsIn', { time: digitsText.value })
  }
  return t('store.flash.remaining', { time: digitsText.value })
})

function checkEnded(): void {
  if (split.value.isEnded) {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (!hasEmittedEnded.value) {
      hasEmittedEnded.value = true
      emit('ended')
    }
  }
}

watch(
  () => props.endsAt,
  () => {
    now.value = Date.now()
    hasEmittedEnded.value = false
    checkEnded()
  },
)

onMounted(() => {
  checkEnded()
  if (!split.value.isEnded) {
    timer = setInterval(() => {
      now.value = Date.now()
      checkEnded()
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <!-- Static accessible label for screen readers (clock-independent) -->
    <span class="sr-only">{{ staticLabel }}</span>

    <!-- Visual ticking part (clock-dependent, aria-hidden) -->
    <span
      v-if="!split.isEnded"
      aria-hidden="true"
      class="num inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 sm:text-xs whitespace-nowrap"
    >
      <Clock class="size-3.5 shrink-0 text-amber-800 dark:text-amber-400" />
      <span>{{ displayText }}</span>
    </span>

    <!-- Ended state -->
    <span
      v-else
      class="text-[11px] font-bold text-destructive sm:text-xs whitespace-nowrap"
    >
      {{ t('store.flash.ended') }}
    </span>
  </span>
</template>
