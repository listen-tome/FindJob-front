<script setup lang="ts">
import { computed } from 'vue'
import { companyMark, companyTone } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    radius?: number
  }>(),
  { size: 40, radius: 12 },
)

const tone = computed(() => companyTone(props.name))
const mark = computed(() => companyMark(props.name))
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${props.radius}px`,
  background: `linear-gradient(145deg, ${tone.value.from}, ${tone.value.to})`,
  fontSize: `${Math.max(10, props.size * 0.28)}px`,
}))
</script>

<template>
  <span class="company-avatar" :style="style" :title="name" aria-hidden="true">
    <span>{{ mark }}</span>
  </span>
</template>

<style scoped>
.company-avatar {
  position: relative;
  display: inline-grid;
  flex-shrink: 0;
  overflow: hidden;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.94);
  place-items: center;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    0 2px 6px rgba(23, 33, 29, 0.1);
}

.company-avatar::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), transparent 50%);
}

.company-avatar span {
  position: relative;
  z-index: 1;
}
</style>
