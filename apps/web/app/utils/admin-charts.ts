export interface ChartDatum {
  label: string
  value: number
  /** Shorter text for the x axis; falls back to `label`. */
  axisLabel?: string
}

export interface ChartPosition extends ChartDatum {
  index: number
  x: number
  y: number
  xPct: number
  yPct: number
}

export interface ChartGridLine {
  value: number
  y: number
  yPct: number
}

export interface ChartScale {
  width: number
  height: number
  max: number
  /** View-box y where the zero value sits (bottom of the plot area). */
  baselineY: number
  gridLines: ChartGridLine[]
  positions: ChartPosition[]
}

export interface ChartScaleOptions {
  width?: number
  height?: number
  /** Places the newest point at the left edge; otherwise the oldest point is on the left. */
  newestAtLeft?: boolean
}

export const CHART_VIEW_WIDTH = 720
export const CHART_VIEW_HEIGHT = 260
export const CHART_PAD_X = 12

const PAD_TOP = 14
const PAD_BOTTOM = 10
const NICE_STEPS = [1, 2, 2.5, 5, 10] as const

function niceStep(minimum: number): number {
  const exponent = Math.floor(Math.log10(minimum))
  const base = 10 ** exponent
  const scaled = minimum / base
  const step = NICE_STEPS.find((candidate) => scaled <= candidate + 1e-9) ?? 10
  return step * base
}

/**
 * Axis ticks from 0 to a round ceiling of `rawMax`. Integer data (order counts)
 * always yields integer ticks; an all-zero series collapses to the single tick 0.
 */
export function axisTicks(rawMax: number): number[] {
  if (!(rawMax > 0)) return [0]
  let step = niceStep(rawMax / 3)
  if (Number.isInteger(rawMax)) step = Math.ceil(step)
  const count = Math.ceil(rawMax / step)
  return Array.from({ length: count + 1 }, (_, index) => index * step)
}

/** Evenly thinned label indices for the x axis, always keeping first and last points. */
export function thinIndices(length: number, maxLabels = 6): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index)
  const step = Math.ceil((length - 1) / (maxLabels - 1))
  const indices: number[] = []
  for (let index = 0; index < length; index += step) indices.push(index)
  if (indices[indices.length - 1] !== length - 1) indices.push(length - 1)
  return indices
}

/** Index of the point closest to a horizontal pointer ratio (0 = left edge, 1 = right edge). */
export function nearestPointIndex(positions: readonly { xPct: number }[], ratio: number): number {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  positions.forEach((position, index) => {
    const distance = Math.abs(position.xPct / 100 - ratio)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

/**
 * Maps chronological chart data to view-box coordinates. The time axis starts at the
 * reading start, so in RTL (`newestAtLeft = true`) the oldest point sits on the right
 * and the newest on the left; in LTR it is the opposite.
 */
export function scalePoints(
  points: readonly ChartDatum[],
  options: ChartScaleOptions = {},
): ChartScale {
  const width = options.width ?? CHART_VIEW_WIDTH
  const height = options.height ?? CHART_VIEW_HEIGHT
  const newestAtLeft = options.newestAtLeft ?? false
  const plotWidth = width - CHART_PAD_X * 2
  const plotHeight = height - PAD_TOP - PAD_BOTTOM
  const baselineY = height - PAD_BOTTOM

  const rawMax = points.reduce((max, point) => Math.max(max, point.value), 0)
  const ticks = axisTicks(rawMax)
  const max = ticks[ticks.length - 1] ?? 0

  const yFor = (value: number): number =>
    max === 0 ? baselineY : PAD_TOP + (1 - value / max) * plotHeight

  const positions = points.map((point, index) => {
    const fraction = points.length <= 1 ? 0.5 : index / (points.length - 1)
    const x = CHART_PAD_X + (newestAtLeft ? 1 - fraction : fraction) * plotWidth
    const y = yFor(point.value)
    return { ...point, index, x, y, xPct: (x / width) * 100, yPct: (y / height) * 100 }
  })

  const gridLines = ticks.map((value) => {
    const y = yFor(value)
    return { value, y, yPct: (y / height) * 100 }
  })

  return { width, height, max, baselineY, gridLines, positions }
}
