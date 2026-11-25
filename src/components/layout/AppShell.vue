<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SideNav from './SideNav.vue'
import TopBar from './TopBar.vue'
import CommandPalette from './CommandPalette.vue'
import { useApplicationStore } from '@/stores/applications'
import { useInterviewStore } from '@/stores/interviews'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const ui = useUiStore()
const applications = useApplicationStore()
const interviews = useInterviewStore()

onMounted(() => {
  void Promise.allSettled([applications.fetchAll(), interviews.fetchAll()])
})

watch(
  () => route.fullPath,
  () => ui.closeSidebar(),
)
</script>

<template>
  <div class="app-shell">
    <SideNav />
    <Transition name="scrim">
      <div v-if="ui.sidebarOpen" class="sidebar-scrim" @click="ui.closeSidebar" />
    </Transition>

    <div class="app-main">
      <TopBar />
      <main id="main-content">
        <router-view />
      </main>
    </div>

    <CommandPalette />
  </div>
</template>

<style scoped>
.scrim-enter-active,
.scrim-leave-active {
  transition: opacity 0.2s ease;
}

.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}
</style>
