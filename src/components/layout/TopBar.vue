<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bell,
  Menu,
  Moon,
  Plus,
  Search,
  Sunny,
  SwitchButton,
  User,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useInterviewStore } from '@/stores/interviews'
import { useUiStore } from '@/stores/ui'
import { countdownLabel, formatTime, relativeDay } from '@/utils/date'
import { initials } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()
const interviews = useInterviewStore()

const title = computed(() => route.meta.title || '工作台')
const initialsText = computed(() => initials(auth.user?.name || '同学'))
const upcoming = computed(() => interviews.upcoming.slice(0, 3))

function handleUserCommand(command: string): void {
  if (command === 'settings') {
    router.push('/settings')
    return
  }
  if (command === 'logout') {
    auth.logout()
    ElMessage.success('已安全退出')
    router.push('/login')
  }
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button
        class="icon-btn icon-btn--quiet topbar__menu"
        type="button"
        aria-label="打开导航"
        @click="ui.toggleSidebar"
      >
        <Menu :size="18" />
      </button>
      <div class="topbar__crumb">
        <span>OfferPilot</span>
        <span class="topbar__crumb-sep">/</span>
        <strong>{{ title }}</strong>
      </div>
    </div>

    <div class="topbar__right">
      <button class="topbar__search" type="button" aria-label="全局搜索" @click="ui.openCommand">
        <Search :size="15" />
        <span>搜索投递、公司或页面</span>
        <kbd>Ctrl K</kbd>
      </button>

      <RouterLink to="/applications?new=1" class="btn btn--primary btn--sm topbar__new">
        <Plus :size="14" />
        <span>新建投递</span>
      </RouterLink>

      <el-popover placement="bottom-end" :width="330" trigger="click" popper-class="notif-popper">
        <template #reference>
          <button class="icon-btn topbar__notif" type="button" aria-label="面试提醒">
            <Bell :size="17" />
            <span v-if="upcoming.length" class="topbar__notif-dot" />
          </button>
        </template>
        <div class="notif">
          <div class="notif__head">
            <strong>近期面试</strong>
            <span>{{ upcoming.length }} 场待参加</span>
          </div>
          <div v-if="upcoming.length" class="notif__list">
            <button
              v-for="interview in upcoming"
              :key="interview.id"
              class="notif__item"
              type="button"
              @click="router.push('/interviews')"
            >
              <span class="notif__date">
                <strong>{{ relativeDay(interview.scheduledAt) }}</strong>
                <small>{{ formatTime(interview.scheduledAt) }}</small>
              </span>
              <span class="notif__copy">
                <strong>{{ interview.company }}</strong>
                <small>{{ interview.round }} · {{ interview.position }}</small>
              </span>
              <span class="notif__countdown">{{ countdownLabel(interview.scheduledAt) }}</span>
            </button>
          </div>
          <div v-else class="notif__empty">暂时没有待参加面试，安心准备。</div>
          <button class="notif__all" type="button" @click="router.push('/interviews')">
            查看全部日程
          </button>
        </div>
      </el-popover>

      <button
        class="icon-btn icon-btn--quiet"
        type="button"
        :aria-label="ui.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        @click="ui.toggleTheme"
      >
        <Sunny v-if="ui.theme === 'dark'" :size="17" />
        <Moon v-else :size="17" />
      </button>

      <span class="topbar__divider" />

      <el-dropdown trigger="click" @command="handleUserCommand">
        <button class="user-chip" type="button" aria-label="账户菜单">
          <span class="avatar avatar--md">{{ initialsText }}</span>
          <span class="user-chip__meta">
            <span class="user-chip__name">{{ auth.user?.name || '同学' }}</span>
            <span class="user-chip__role">{{ auth.user?.targetRole || '求职进行中' }}</span>
          </span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings">
              <User :size="14" style="margin-right: 8px" /> 个人资料
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              <SwitchButton :size="14" style="margin-right: 8px" /> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.notif__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 4px 4px 10px;
  border-bottom: 1px solid var(--line);
}

.notif__head strong {
  font-size: 13px;
  font-weight: 700;
}

.notif__head span {
  font-size: 10px;
  color: var(--faint);
}

.notif__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 0;
}

.notif__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.notif__item:hover {
  background: var(--surface-soft);
}

.notif__date {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 52px;
  padding: 5px 0;
  background: var(--brand-soft);
  border-radius: 7px;
}

.notif__date strong {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand);
}

.notif__date small {
  margin-top: 1px;
  font-size: 9px;
  color: var(--muted);
}

.notif__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.notif__copy strong {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--ink);
}

.notif__copy small {
  overflow: hidden;
  font-size: 9.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif__countdown {
  font-size: 9px;
  font-weight: 650;
  color: var(--coral);
  white-space: nowrap;
}

.notif__empty {
  padding: 28px 8px;
  font-size: 11px;
  color: var(--faint);
  text-align: center;
}

.notif__all {
  width: 100%;
  padding: 9px 0 3px;
  font-size: 10.5px;
  font-weight: 650;
  color: var(--brand);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
}
</style>
