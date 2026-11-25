<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
  }>(),
  { eyebrow: 'OfferPilot', description: '' },
)
</script>

<template>
  <header class="page-head">
    <div class="page-head__copy">
      <div v-if="eyebrow" class="page-head__eyebrow">{{ eyebrow }}</div>
      <h1>{{ title }}</h1>
      <p v-if="description" class="page-head__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-head__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-head__copy {
  min-width: 0;
}
</style>
