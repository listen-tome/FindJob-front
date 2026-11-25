<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 38 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="12" fill="#E8F1C7" />
    <path
      d="M8.5 27.5c5.6-1.3 7.8-5.3 10.1-12.1 2.4 5.7 4.9 8.8 11.4 9.5"
      stroke="#145C4A"
      stroke-width="2.7"
      stroke-linecap="round"
    />
    <circle cx="8.7" cy="27.5" r="2.4" fill="#145C4A" />
    <circle cx="30" cy="24.9" r="2.4" fill="#145C4A" />
    <path
      d="M20.5 12.5l3.3 3-3.3 3"
      stroke="#145C4A"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
