<script setup lang="ts">
import { getCountdownSplit } from '~/utils/countdown'

const props = defineProps<{
  endsAt: string
}>()

const { t } = useI18n()
const hydrated = useHydrated()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const split = computed(() => getCountdownSplit(props.endsAt, now.value))
const pad = (n: number): string => String(n).padStart(2, '0')

// Days fold into the hours box, as in the prototype (HRS / MIN / SEC)
const boxes = computed(() => {
  const s = split.value
  const ready = hydrated.value
  return [
    { label: 'HRS', value: ready ? pad(s.days * 24 + s.hours) : '--', hot: false },
    { label: 'MIN', value: ready ? pad(s.minutes) : '--', hot: false },
    { label: 'SEC', value: ready ? pad(s.seconds) : '--', hot: true },
  ]
})
</script>

<template>
  <div class="flex items-center gap-3.5">
    <span class="font-bold text-serag-ink">{{ t('store.home.flashEndsIn') }}</span>
    <div class="num flex gap-2.5" role="timer" aria-live="off">
      <div
        v-for="box in boxes"
        :key="box.label"
        :class="[
          'min-w-16 rounded-2xl py-2.5 text-center sm:min-w-[72px]',
          box.hot ? 'bg-[#C8431F] text-white' : 'bg-serag-ink text-serag-gold-hi',
        ]"
      >
        <div class="text-[28px] leading-none font-extrabold sm:text-[34px]">{{ box.value }}</div>
        <div :class="['mt-1 text-[11px] tracking-[2px]', box.hot ? 'text-white' : 'text-[#B9C7B6]']">
          {{ box.label }}
        </div>
      </div>
    </div>
  </div>
</template>
