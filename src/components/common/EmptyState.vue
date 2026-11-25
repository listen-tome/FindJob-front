<script setup lang="ts">
import { Briefcase } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: '这里还没有内容',
    description: '完成第一条记录后，它会出现在这里。',
  },
)
</script>

<template>
  <div class="empty">
    <div class="empty__icon">
      <slot name="icon">
        <Briefcase :size="20" />
      </slot>
    </div>
    <div class="empty__title">{{ title }}</div>
    <p class="empty__desc">{{ description }}</p>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty__action {
  margin-top: 16px;
}
</style>
