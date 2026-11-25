<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Calendar,
  Collection,
  DataBoard,
  Document,
  Setting,
  TrendCharts,
  Close,
} from '@element-plus/icons-vue'
import BrandMark from '@/components/common/BrandMark.vue'
import { useApplicationStore } from '@/stores/applications'
import { useAuthStore } from '@/stores/auth'
import { useInterviewStore } from '@/stores/interviews'
import { useUiStore } from '@/stores/ui'
import { clamp } from '@/utils/format'

const route = useRoute()
const ui = useUiStore()
const auth = useAuthStore()
const applications = useApplicationStore()
const interviews = useInterviewStore()

const weeklyGoal = computed(() => auth.user?.weeklyGoal ?? 8)
const weeklyPercent = computed(() =>
  clamp(Math.round((applications.weeklyApplied / Math.max(weeklyGoal.value, 1)) * 100), 0, 100),
)

const navGroups = computed(() => [
  {
    label: '工作台',
    items: [
      { label: '概览', path: '/dashboard', icon: DataBoard, badge: 0 },
      {
        label: '投递管理',
        path: '/applications',
        icon: Collection,
        badge: applications.total || 0,
      },
      {
        label: '面试日程',
        path: '/interviews',
        icon: Calendar,
        badge: interviews.upcoming.length,
      },
    ],
  },
  {
    label: '资产与复盘',
    items: [
      { label: '简历库', path: '/resumes', icon: Document, badge: 0 },
      { label: '数据分析', path: '/analytics', icon: TrendCharts, badge: 0 },
    ],
  },
  {
    label: '偏好',
    items: [{ label: '个人设置', path: '/settings', icon: Setting, badge: 0 }],
  },
])

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function closeOnNavigate(): void {
  ui.closeSidebar()
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': ui.sidebarOpen }" aria-label="主导航">
    <div class="sidebar__brand">
      <BrandMark :size="36" />
      <div class="sidebar__brand-copy">
        <span class="sidebar__brand-name">OfferPilot</span>
        <span class="sidebar__brand-tag">Career Cockpit</span>
      </div>
      <button class="sidebar__close" type="button" aria-label="关闭导航" @click="ui.closeSidebar">
        <Close :size="18" />
      </button>
    </div>

    <nav class="sidebar__nav">
      <div v-for="group in navGroups" :key="group.label" class="nav-group">
        <div class="nav-label">{{ group.label }}</div>
        <div class="nav-list">
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ 'router-link-active': isActive(item.path) }"
            @click="closeOnNavigate"
          >
            <span class="nav-item__icon">
              <component :is="item.icon" :size="17" />
            </span>
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item__badge num">{{ item.badge }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="sidebar-note">
      <span class="sidebar-note__label">TODAY'S NOTE</span>
      <p>先完成，再完美。<br />投出去，才有反馈。</p>
    </div>

    <div class="sidebar__footer">
      <div class="sidebar-goal">
        <div class="sidebar-goal__head">
          <span class="sidebar-goal__title">本周投递目标</span>
          <span class="sidebar-goal__value num">{{ applications.weeklyApplied }} / {{ weeklyGoal }}</span>
        </div>
        <div class="sidebar-goal__bar" aria-hidden="true">
          <div class="sidebar-goal__fill" :style="{ width: `${weeklyPercent}%` }" />
        </div>
        <p class="sidebar-goal__hint">
          {{ weeklyPercent >= 100 ? '目标达成，保持节奏。' : `还差 ${Math.max(weeklyGoal - applications.weeklyApplied, 0)} 次投递，别让好岗位等太久。` }}
        </p>
      </div>
      <div class="sidebar-status">
        <span class="sidebar-status__dot" />
        Spring Boot API
      </div>
    </div>
  </aside>
</template>
