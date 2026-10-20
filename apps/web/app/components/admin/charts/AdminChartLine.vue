<script setup lang="ts">
import type { ChartDatum, ChartPosition } from '~/utils/admin-charts'
import { nearestPointIndex, scalePoints, thinIndices } from '~/utils/admin-charts'

const props = defineProps<{
  points: ChartDatum[]
  formatValue: (n: number) => string
  label: string
}>()

const { t, locale } = useI18n()
const chartBox = ref<HTMLDivElement | null>(null)
const showTable = ref(false)
const activeIndex = ref<number | null>(null)

// The time axis starts at the reading start, so the newest point sits on the
// opposite physical side in RTL: reading runs right-to-left, oldest first.
const newestAtLeft = computed(() => locale.value === 'ar')

const scale = computed(() => scalePoints(props.points, { newestAtLeft: newestAtLeft.value }))

const activePoint = computed<ChartPosition | null>(() => {
  const index = activeIndex.value
  if (index === null) return null
  return scale.value.positions[index] ?? null
})

// Phones get three axis labels (first, middle, last); wider screens up to six.
const xLabels = computed(() => {
  const narrow = new Set(thinIndices(props.points.length, 3))
  const wide = new Set(thinIndices(props.points.length))
  return [...new Set([...wide, ...narrow])]
    .sort((a, b) => a - b)
    .flatMap((index) => {
      const position = scale.value.positions[index]
      if (!position) return []
      const visibility = !narrow.has(index) ? 'max-sm:hidden' : !wide.has(index) ? 'sm:hidden' : ''
      return [{ index, text: position.axisLabel ?? position.label, xPct: position.xPct, visibility }]
    })
})

const linePath = computed(() =>
  scale.value.positions
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' '),
)

const areaPath = computed(() => {
  const positions = scale.value.positions
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (!first || !last) return ''
  return `${linePath.value} L${last.x.toFixed(1)},${scale.value.baselineY} L${first.x.toFixed(1)},${scale.value.baselineY} Z`
})

const dotStyle = computed(() => {
  const point = activePoint.value
  if (!point) return undefined
  return { left: `${point.xPct}%`, top: `${point.yPct}%` }
})

const tooltipStyle = computed(() => {
  const point = activePoint.value
  if (!point) return undefined
  const translateX = point.xPct <= 15 ? '0%' : point.xPct >= 85 ? '-100%' : '-50%'
  return {
    left: `${point.xPct}%`,
    top: `${point.yPct}%`,
    transform: `translate(${translateX}, calc(-100% - 10px))`,
  }
})

function xLabelStyle(xPct: number): { left: string; transform: string } {
  const translateX = xPct <= 2 ? '0%' : xPct >= 98 ? '-100%' : '-50%'
  return { left: `${xPct}%`, transform: `translateX(${translateX})` }
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return
  const rect = chartBox.value?.getBoundingClientRect()
  if (!rect || rect.width === 0 || scale.value.positions.length === 0) return
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  activeIndex.value = nearestPointIndex(scale.value.positions, ratio)
}

function onFocus(): void {
  const last = props.points.length - 1
  if (last >= 0) activeIndex.value = last
}

function onKeydown(event: KeyboardEvent): void {
  const count = props.points.length
  if (count === 0) return
  let next: number | null = null
  if (event.key === 'ArrowRight') {
    next = (activeIndex.value ?? count - 1) + (newestAtLeft.value ? -1 : 1)
  } else if (event.key === 'ArrowLeft') {
    next = (activeIndex.value ?? count - 1) + (newestAtLeft.value ? 1 : -1)
  } else if (event.key === 'Home') {
    next = 0
  } else if (event.key === 'End') {
    next = count - 1
  }
  if (next === null) return
  event.preventDefault()
  activeIndex.value = Math.min(count - 1, Math.max(0, next))
}
</script>

<template>
  <div class="flex min-w-0 flex-col">
    <div class="flex gap-2">
      <!-- Y-axis value labels -->
      <div class="relative h-56 w-14 shrink-0" aria-hidden="true">
        <span
          v-for="line in scale.gridLines"
          :key="line.value"
          class="num absolute end-0 -translate-y-1/2 text-[10px] leading-none text-muted-foreground"
          :style="{ top: `${line.yPct}%` }"
        >
          {{ formatValue(line.value) }}
        </span>
      </div>

      <div ref="chartBox" class="relative h-56 min-w-0 flex-1">
        <svg
          :viewBox="`0 0 ${scale.width} ${scale.height}`"
          preserveAspectRatio="none"
          class="h-full w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          role="img"
          :aria-label="label"
          tabindex="0"
          @pointermove="onPointerMove"
          @pointerleave="activeIndex = null"
          @focus="onFocus"
          @blur="activeIndex = null"
          @keydown="onKeydown"
        >
          <line
            v-for="line in scale.gridLines"
            :key="line.value"
            :x1="0"
            :x2="scale.width"
            :y1="line.y"
            :y2="line.y"
            class="stroke-border/60"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="0"
            :x2="scale.width"
            :y1="scale.baselineY"
            :y2="scale.baselineY"
            class="stroke-border"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
          <path v-if="areaPath" :d="areaPath" class="fill-serag-green/10 dark:fill-serag-gold/10" />
          <path
            v-if="linePath"
            :d="linePath"
            fill="none"
            class="stroke-serag-green dark:stroke-serag-gold"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- Focus dot & tooltip rendered as HTML overlays so they never distort. -->
        <span
          v-if="activePoint && dotStyle"
          class="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-serag-gold"
          :style="dotStyle"
          aria-hidden="true"
        />
        <div
          v-if="activePoint && tooltipStyle"
          role="status"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-foreground shadow-md"
          :style="tooltipStyle"
        >
          <span class="num">{{ formatValue(activePoint.value) }}</span>
          <span class="text-muted-foreground"> · {{ activePoint.label }}</span>
        </div>
      </div>
    </div>

    <!-- Thinned x-axis labels -->
    <div class="relative ms-16 mt-1 h-4" aria-hidden="true">
      <span
        v-for="tick in xLabels"
        :key="tick.index"
        class="num absolute top-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground"
        :class="tick.visibility"
        :style="xLabelStyle(tick.xPct)"
      >
        {{ tick.text }}
      </span>
    </div>

    <div class="mt-2 flex justify-end">
      <button
        type="button"
        class="inline-flex min-h-9 items-center rounded-lg border border-border/60 bg-background px-3 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        :aria-expanded="showTable"
        @click="showTable = !showTable"
      >
        {{ showTable ? t('admin.charts.hideTable') : t('admin.charts.showTable') }}
      </button>
    </div>

    <div :class="showTable ? 'mt-2 overflow-x-auto' : 'sr-only'">
      <table class="w-full border-collapse text-xs" :class="{ 'border border-border': showTable }">
        <caption class="pb-2 text-start text-xs font-semibold text-muted-foreground">
          {{ label }}
        </caption>
        <thead class="border-b border-border bg-muted/40 font-bold text-muted-foreground">
          <tr>
            <th class="px-3 py-2 text-start">
              {{ t('admin.charts.tableDate') }}
            </th>
            <th class="px-3 py-2 text-start">
              {{ t('admin.charts.tableValue') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="point in points" :key="point.label">
            <td class="px-3 py-1.5 text-foreground">
              {{ point.label }}
            </td>
            <td class="num px-3 py-1.5 font-bold text-foreground">
              {{ formatValue(point.value) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
