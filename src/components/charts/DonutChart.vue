<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_META } from '@/constants/meta'
import type { StatusDatum } from '@/types'

const props = withDefaults(
  defineProps<{
    data: StatusDatum[]
    size?: number
    showLegend?: boolean
  }>(),
  { size: 168, showLegend: true },
)

const total = computed(() => props.data.reduce((sum, item) => sum + item.value, 0))
const radius = computed(() => (props.size - 24) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const segments = computed(() => {
  let offset = 0
  return props.data
    .filter((item) => item.value > 0)
    .map((item) => {
      const fraction = total.value ? item.value / total.value : 0
      const length = fraction * circumference.value
      const segment = {
        ...item,
        meta: STATUS_META[item.status],
        percent: Math.round(fraction * 100),
        dasharray: `${Math.max(length - 3, 0.5)} ${circumference.value - Math.max(length - 3, 0.5)}`,
        dashoffset: -offset,
      }
      offset += length
      return segment
    })
})
</script>

<template>
  <div class="donut">
    <div class="donut__visual" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="投递状态分布">
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          stroke="var(--surface-muted)"
          :stroke-width="size > 150 ? 16 : 13"
        />
        <circle
          v-for="segment in segments"
          :key="segment.status"
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          :stroke="segment.meta.color"
          :stroke-width="size > 150 ? 16 : 13"
          :stroke-dasharray="segment.dasharray"
          :stroke-dashoffset="segment.dashoffset"
          stroke-linecap="round"
          :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        >
          <title>{{ segment.meta.label }}：{{ segment.value }} 条</title>
        </circle>
      </svg>
      <div class="donut__center">
        <strong class="num">{{ total }}</strong>
        <span>全部记录</span>
      </div>
    </div>

    <ul v-if="showLegend" class="donut__legend">
      <li v-for="segment in segments" :key="segment.status">
        <span class="donut__dot" :style="{ background: segment.meta.color }" />
        <span class="donut__label">{{ segment.meta.label }}</span>
        <strong class="num">{{ segment.value }}</strong>
        <span class="donut__percent num">{{ segment.percent }}%</span>
      </li>
      <li v-if="!segments.length" class="donut__empty">暂无状态数据</li>
    </ul>
  </div>
</template>

<style scoped>
.donut {
  display: flex;
  align-items: center;
  gap: 26px;
}

.donut__visual {
  position: relative;
  flex-shrink: 0;
}

.donut__visual svg {
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}

.donut__visual circle {
  transition: stroke-dasharray 0.6s ease;
}

.donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.donut__center strong {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.05em;
  color: var(--ink);
}

.donut__center span {
  margin-top: 5px;
  font-size: 9px;
  color: var(--faint);
}

.donut__legend {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.donut__legend li {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto 34px;
  gap: 8px;
  align-items: center;
  font-size: 11px;
}

.donut__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.donut__label {
  overflow: hidden;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut__legend strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}

.donut__percent {
  font-size: 9.5px;
  color: var(--faint);
  text-align: right;
}

.donut__empty {
  display: block !important;
  font-size: 11px;
  color: var(--faint);
}

@media (max-width: 560px) {
  .donut {
    gap: 18px;
  }

  .donut__visual {
    width: 142px !important;
    height: 142px !important;
  }
}
</style>
