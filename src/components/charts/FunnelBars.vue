<script setup lang="ts">
import { computed } from 'vue'
import type { FunnelItem } from '@/types'

const props = defineProps<{ items: FunnelItem[] }>()

const max = computed(() => props.items[0]?.value || 1)

const barColors = [
  'linear-gradient(90deg, #145c49, #2f7d66)',
  'linear-gradient(90deg, #3f7f6a, #62a48d)',
  'linear-gradient(90deg, #879a53, #b0bf6c)',
  'linear-gradient(90deg, #b9d55e, #d9ef6f)',
]

function width(value: number): string {
  if (!value) return '0%'
  return `${Math.max(7, (value / max.value) * 100)}%`
}
</script>

<template>
  <div class="funnel">
    <div v-for="(item, index) in items" :key="item.key" class="funnel__row">
      <div class="funnel__head">
        <span class="funnel__label">
          <i class="funnel__dot" :style="{ background: barColors[index].match(/#[a-f0-9]{6}/i)?.[0] }" />
          {{ item.label }}
        </span>
        <span class="funnel__value num">{{ item.value }}</span>
      </div>
      <div class="funnel__track">
        <div
          class="funnel__bar"
          :style="{ width: width(item.value), background: barColors[index] ?? barColors[3] }"
        />
      </div>
      <div class="funnel__rate">
        <span v-if="index === 0">全部投递</span>
        <span v-else>阶段转化 <strong>{{ item.rate }}%</strong></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.funnel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.funnel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
}

.funnel__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-soft);
}

.funnel__dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
}

.funnel__value {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.funnel__track {
  height: 8px;
  overflow: hidden;
  background: var(--surface-soft);
  border-radius: 99px;
}

.funnel__bar {
  height: 100%;
  border-radius: inherit;
  transition: width 0.7s cubic-bezier(0.2, 0.75, 0.25, 1);
}

.funnel__rate {
  margin-top: 5px;
  font-size: 9.5px;
  color: var(--faint);
  text-align: right;
}

.funnel__rate strong {
  font-weight: 700;
  color: var(--muted);
}
</style>
