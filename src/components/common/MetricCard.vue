<script setup lang="ts">
import { computed, type Component } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: number | string
    suffix?: string
    decimals?: number
    delta?: number
    note?: string
    icon: Component
    tone?: 'green' | 'blue' | 'coral' | 'amber'
    spark?: number[]
    invertDelta?: boolean
  }>(),
  {
    suffix: '',
    decimals: 0,
    delta: 0,
    note: '',
    tone: 'green',
    spark: () => [],
    invertDelta: false,
  },
)

const displayValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  return props.value.toLocaleString('zh-CN', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })
})

const deltaGood = computed(() => {
  if (!props.delta) return null
  const positive = props.delta > 0
  return props.invertDelta ? !positive : positive
})

const deltaText = computed(() => {
  if (!props.delta) return '持平'
  return `${props.delta > 0 ? '+' : ''}${props.delta.toFixed(props.decimals > 0 ? 1 : 0)}`
})

const sparkId = `spark-${Math.random().toString(36).slice(2, 9)}`
const hasSpark = computed(() => props.spark.length >= 2)

const sparkPath = computed(() => {
  const values = props.spark.length >= 2 ? props.spark : [2, 3, 3, 5, 4, 6, 6, 8]
  const width = 92
  const height = 40
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - 4 - ((value - min) / range) * (height - 10)
    return [x, y] as const
  })
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return {
    line,
    area: `${line} L${width},${height} L0,${height} Z`,
  }
})
</script>

<template>
  <article class="metric-card" :class="`metric-card--${tone}`">
    <div class="metric-card__head">
      <span class="metric-card__label">{{ label }}</span>
      <span class="metric-card__icon">
        <component :is="icon" :size="15" />
      </span>
    </div>
    <div class="metric-card__body">
      <div class="metric-card__value num">
        {{ displayValue }}<small v-if="suffix">{{ suffix }}</small>
      </div>
      <svg v-if="hasSpark" class="metric-card__spark" viewBox="0 0 92 40" aria-hidden="true">
        <defs>
          <linearGradient :id="sparkId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.18" />
            <stop offset="1" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="sparkPath.area" :fill="`url(#${sparkId})`" />
        <path
          :d="sparkPath.line"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <div class="metric-card__foot">
      <span
        v-if="delta !== undefined"
        class="metric-card__delta"
        :class="{
          'is-good': deltaGood === true,
          'is-bad': deltaGood === false,
          'is-flat': deltaGood === null,
        }"
      >
        <ArrowUp v-if="delta > 0" :size="10" />
        <ArrowDown v-else-if="delta < 0" :size="10" />
        {{ deltaText }}
      </span>
      <span class="metric-card__note">{{ note }}</span>
    </div>
  </article>
</template>

<style scoped>
.metric-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 150px;
  padding: 19px 20px 16px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.metric-card:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.metric-card::before {
  position: absolute;
  top: 0;
  left: 20px;
  width: 34px;
  height: 2px;
  content: '';
  background: var(--metric-color);
  border-radius: 0 0 3px 3px;
}

.metric-card--green {
  --metric-color: var(--brand);
  --metric-soft: var(--brand-soft);
}

.metric-card--blue {
  --metric-color: var(--blue);
  --metric-soft: var(--blue-soft);
}

.metric-card--coral {
  --metric-color: var(--coral);
  --metric-soft: var(--coral-soft);
}

.metric-card--amber {
  --metric-color: var(--amber);
  --metric-soft: var(--amber-soft);
}

.metric-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-card__label {
  font-size: 11.5px;
  font-weight: 620;
  color: var(--muted);
}

.metric-card__icon {
  display: grid;
  width: 29px;
  height: 29px;
  color: var(--metric-color);
  background: var(--metric-soft);
  border-radius: 9px;
  place-items: center;
}

.metric-card__body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  margin-top: 12px;
}

.metric-card__value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.055em;
  color: var(--ink);
}

.metric-card__value small {
  margin-left: 3px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--muted);
}

.metric-card__spark {
  width: 78px;
  height: 34px;
  margin-bottom: 1px;
  color: var(--metric-color);
  opacity: 0.8;
}

.metric-card__foot {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 13px;
}

.metric-card__delta {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 21px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 5px;
}

.metric-card__delta.is-good {
  color: var(--brand);
  background: var(--brand-soft);
}

.metric-card__delta.is-bad {
  color: var(--coral);
  background: var(--coral-soft);
}

.metric-card__delta.is-flat {
  color: var(--muted);
  background: var(--surface-soft);
}

.metric-card__note {
  overflow: hidden;
  font-size: 9.5px;
  color: var(--faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .metric-card {
    min-height: 136px;
    padding: 16px;
  }

  .metric-card__value {
    font-size: 27px;
  }

  .metric-card__spark {
    width: 62px;
  }
}
</style>
