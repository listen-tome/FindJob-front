<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_META } from '@/constants/meta'
import type { ApplicationStatus } from '@/types'

const props = withDefaults(
  defineProps<{
    status: ApplicationStatus
    dot?: boolean
    compact?: boolean
  }>(),
  { dot: true, compact: false },
)

const meta = computed(() => STATUS_META[props.status])
const style = computed(() => ({
  color: meta.value.color,
  background: meta.value.soft,
}))
</script>

<template>
  <span class="status-pill" :class="{ 'status-pill--compact': compact }" :style="style">
    <span v-if="dot" class="status-pill__dot" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
  border-radius: 7px;
}

.status-pill--compact {
  height: 22px;
  padding: 0 7px;
  font-size: 10px;
  border-radius: 6px;
}

.status-pill__dot {
  width: 5px;
  height: 5px;
  background: currentColor;
  border-radius: 50%;
}
</style>
