<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { TrendPoint } from '@/types'
import { clamp } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    data: TrendPoint[]
    height?: number
    showLegend?: boolean
  }>(),
  { height: 248, showLegend: true },
)

const wrapper = ref<HTMLDivElement | null>(null)
const chartWidth = ref(760)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!wrapper.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width
    if (width) chartWidth.value = Math.max(280, Math.floor(width))
  })
  resizeObserver.observe(wrapper.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const pad = computed(() => ({
  left: chartWidth.value < 480 ? 26 : 34,
  right: 12,
  top: 18,
  bottom: 28,
}))

const chartHeight = computed(() => props.height)
const plotWidth = computed(() => chartWidth.value - pad.value.left - pad.value.right)
const plotHeight = computed(() => chartHeight.value - pad.value.top - pad.value.bottom)
const gradientId = `trend-fill-${Math.random().toString(36).slice(2, 8)}`

const yMax = computed(() => {
  const values = props.data.flatMap((item) => [item.applications, item.interviews])
  const max = Math.max(4, ...values)
  return Math.ceil(max / 4) * 4
})

function xAt(index: number): number {
  const count = props.data.length
  if (count <= 1) return pad.value.left + plotWidth.value / 2
  return pad.value.left + (index / (count - 1)) * plotWidth.value
}

function yAt(value: number): number {
  return pad.value.top + plotHeight.value - (value / yMax.value) * plotHeight.value
}

interface Point {
  x: number
  y: number
}

function smoothPath(points: Point[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index]
    const p2 = points[index + 1]
    const midX = (p1.x + p2.x) / 2
    // 使用水平控制点，既保留平滑感，又避免稀疏计数被样条拉出负数。
    path += ` C${midX.toFixed(1)},${p1.y.toFixed(1)} ${midX.toFixed(1)},${p2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return path
}

const applicationPoints = computed<Point[]>(() =>
  props.data.map((item, index) => ({ x: xAt(index), y: yAt(item.applications) })),
)

const interviewPoints = computed<Point[]>(() =>
  props.data.map((item, index) => ({ x: xAt(index), y: yAt(item.interviews) })),
)

const applicationPath = computed(() => smoothPath(applicationPoints.value))
const interviewPath = computed(() => smoothPath(interviewPoints.value))
const areaPath = computed(() => {
  const points = applicationPoints.value
  if (!points.length) return ''
  const base = pad.value.top + plotHeight.value
  const first = points[0]
  const last = points[points.length - 1]
  return `${applicationPath.value} L${last.x.toFixed(1)},${base} L${first.x.toFixed(1)},${base} Z`
})

const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: pad.value.top + plotHeight.value - ratio * plotHeight.value,
    value: Math.round(ratio * yMax.value),
  })),
)

const labelStep = computed(() => {
  const target = chartWidth.value < 480 ? 4 : 7
  return Math.max(1, Math.ceil(props.data.length / target))
})

const xLabels = computed(() =>
  props.data
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.index % labelStep.value === 0 || item.index === props.data.length - 1),
)

const hoverIndex = ref<number | null>(null)

function onMove(event: MouseEvent): void {
  const target = event.currentTarget as SVGRectElement
  const rect = target.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * chartWidth.value
  const ratio = clamp((x - pad.value.left) / plotWidth.value, 0, 1)
  hoverIndex.value = Math.round(ratio * (props.data.length - 1))
}

const hover = computed(() => {
  if (hoverIndex.value === null) return null
  const item = props.data[hoverIndex.value]
  if (!item) return null
  return {
    item,
    x: xAt(hoverIndex.value),
    y: yAt(item.applications),
    yInterview: yAt(item.interviews),
    left: clamp((xAt(hoverIndex.value) / chartWidth.value) * 100, 9, 91),
  }
})

const peak = computed(() => {
  if (!props.data.length) return null
  return props.data.reduce((best, item) => (item.applications > best.applications ? item : best), props.data[0])
})
</script>

<template>
  <div ref="wrapper" class="trend-chart">
    <div v-if="showLegend" class="trend-chart__legend">
      <span class="legend-item">
        <span class="legend-dot legend-dot--brand" />
        投递
      </span>
      <span class="legend-item">
        <span class="legend-dot legend-dot--coral" />
        面试
      </span>
    </div>

    <div class="trend-chart__canvas">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        aria-label="投递与面试趋势图"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.2" />
            <stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <g class="grid">
          <line
            v-for="line in gridLines"
            :key="line.y"
            :x1="pad.left"
            :x2="chartWidth - pad.right"
            :y1="line.y"
            :y2="line.y"
          />
          <text
            v-for="line in gridLines"
            :key="`label-${line.y}`"
            :x="pad.left - 8"
            :y="line.y + 3"
            text-anchor="end"
          >
            {{ line.value }}
          </text>
        </g>

        <path :d="areaPath" :fill="`url(#${gradientId})`" />
        <path
          class="line line--apps"
          :d="applicationPath"
          fill="none"
          pathLength="1"
          stroke="var(--brand)"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          class="line line--interviews"
          :d="interviewPath"
          fill="none"
          pathLength="1"
          stroke="var(--coral)"
          stroke-width="1.7"
          stroke-dasharray="4 5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <g class="x-labels">
          <text
            v-for="item in xLabels"
            :key="item.date"
            :x="xAt(item.index)"
            :y="chartHeight - 8"
            text-anchor="middle"
          >
            {{ item.label }}
          </text>
        </g>

        <g v-if="peak && !hover" class="peak">
          <circle :cx="xAt(data.indexOf(peak))" :cy="yAt(peak.applications)" r="3.5" fill="var(--brand)" />
          <circle
            :cx="xAt(data.indexOf(peak))"
            :cy="yAt(peak.applications)"
            r="7"
            fill="none"
            stroke="var(--brand)"
            stroke-opacity="0.25"
          />
        </g>

        <g v-if="hover" class="hover-layer">
          <line
            :x1="hover.x"
            :x2="hover.x"
            :y1="pad.top"
            :y2="pad.top + plotHeight"
            stroke="var(--line-strong)"
            stroke-dasharray="3 4"
          />
          <circle :cx="hover.x" :cy="hover.y" r="4" fill="var(--surface)" stroke="var(--brand)" stroke-width="2" />
          <circle
            :cx="hover.x"
            :cy="hover.yInterview"
            r="3.5"
            fill="var(--surface)"
            stroke="var(--coral)"
            stroke-width="1.8"
          />
        </g>

        <rect
          :x="pad.left"
          :y="pad.top"
          :width="plotWidth"
          :height="plotHeight"
          fill="transparent"
          @mousemove="onMove"
          @mouseleave="hoverIndex = null"
        />
      </svg>

      <div
        v-if="hover"
        class="chart-tooltip"
        :style="{ left: `${hover.left}%`, top: `${Math.max(0, hover.y - 64)}px` }"
      >
        <span class="chart-tooltip__date">{{ hover.item.date }}</span>
        <span class="chart-tooltip__row">
          <i class="legend-dot legend-dot--brand" /> 投递 <strong>{{ hover.item.applications }}</strong>
        </span>
        <span class="chart-tooltip__row">
          <i class="legend-dot legend-dot--coral" /> 面试 <strong>{{ hover.item.interviews }}</strong>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
}

.trend-chart__legend {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 4px 8px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.legend-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.legend-dot--brand {
  background: var(--brand);
}

.legend-dot--coral {
  background: var(--coral);
}

.trend-chart__canvas {
  position: relative;
  width: 100%;
}

.trend-chart svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid line {
  stroke: var(--line);
  stroke-width: 1;
  stroke-dasharray: 2 5;
}

.grid text,
.x-labels text {
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 550;
  fill: var(--faint);
}

.line--apps {
  animation: draw-line 1.1s cubic-bezier(0.2, 0.75, 0.25, 1) both;
}

.line--interviews {
  animation: fade-line 0.8s 0.15s ease both;
}

.peak {
  animation: pulse-dot 2.4s ease-in-out infinite;
}

.chart-tooltip {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 118px;
  padding: 9px 11px;
  pointer-events: none;
  background: color-mix(in srgb, var(--surface-solid) 94%, transparent);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.chart-tooltip__date {
  margin-bottom: 1px;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: var(--faint);
}

.chart-tooltip__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--muted);
}

.chart-tooltip__row strong {
  margin-left: auto;
  font-size: 11px;
  color: var(--ink);
}

@keyframes draw-line {
  from {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    opacity: 0.4;
  }
  to {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes fade-line {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
