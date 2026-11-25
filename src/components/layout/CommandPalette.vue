<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  Collection,
  DataBoard,
  Document,
  Search,
  Setting,
  TrendCharts,
} from '@element-plus/icons-vue'
import { useApplicationStore } from '@/stores/applications'
import { useUiStore } from '@/stores/ui'
import { STATUS_META } from '@/constants/meta'

interface PaletteItem {
  id: string
  label: string
  meta: string
  kind: '页面' | '投递'
  icon: Component
  keywords: string
  run: () => void
}

const router = useRouter()
const ui = useUiStore()
const applications = useApplicationStore()

const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const basePages = [
  { path: '/dashboard', label: '工作台', meta: '今日概览、待办与近期面试', icon: markRaw(DataBoard), keywords: 'home dashboard 概览 首页' },
  { path: '/applications', label: '投递管理', meta: '列表与看板视图，管理全部投递', icon: markRaw(Collection), keywords: 'application 投递 岗位 看板' },
  { path: '/interviews', label: '面试日程', meta: '日历、面试准备与结果记录', icon: markRaw(Calendar), keywords: 'interview 面试 日历 日程' },
  { path: '/resumes', label: '简历库', meta: '多版本简历与默认简历管理', icon: markRaw(Document), keywords: 'resume 简历 版本 附件' },
  { path: '/analytics', label: '数据分析', meta: '渠道转化、投递趋势与复盘', icon: markRaw(TrendCharts), keywords: 'analytics 数据 分析 转化' },
  { path: '/settings', label: '个人设置', meta: '资料、求职目标与外观偏好', icon: markRaw(Setting), keywords: 'settings 设置 资料 偏好' },
]

function go(path: string, applicationId?: string): void {
  ui.closeCommand()
  router.push(
    applicationId
      ? { path, query: { edit: applicationId } }
      : path,
  )
}

const pageItems = computed<PaletteItem[]>(() =>
  basePages.map((page) => ({
    id: page.path,
    label: page.label,
    meta: page.meta,
    kind: '页面',
    icon: page.icon,
    keywords: page.keywords,
    run: () => go(page.path),
  })),
)

const applicationItems = computed<PaletteItem[]>(() =>
  applications.items.map((app) => ({
    id: app.id,
    label: `${app.company} · ${app.position}`,
    meta: `${STATUS_META[app.status].label} · ${app.location} · ${app.channel}`,
    kind: '投递',
    icon: markRaw(Collection),
    keywords: `${app.company} ${app.position} ${app.location} ${app.tags.join(' ')}`,
    run: () => go('/applications', app.id),
  })),
)

const filteredItems = computed<PaletteItem[]>(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) {
    return [...pageItems.value, ...applicationItems.value.slice(0, 3)]
  }
  return [...pageItems.value, ...applicationItems.value]
    .filter((item) => `${item.label} ${item.meta} ${item.keywords}`.toLowerCase().includes(keyword))
    .slice(0, 8)
})

watch(filteredItems, () => {
  selected.value = 0
})

watch(
  () => ui.commandOpen,
  async (open) => {
    if (open) {
      query.value = ''
      selected.value = 0
      await nextTick()
      inputRef.value?.focus()
    }
  },
)

function move(step: number): void {
  if (!filteredItems.value.length) return
  const length = filteredItems.value.length
  selected.value = (selected.value + step + length) % length
}

function choose(index = selected.value): void {
  const item = filteredItems.value[index]
  if (item) item.run()
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (ui.commandOpen) ui.closeCommand()
    else ui.openCommand()
    return
  }
  if (!ui.commandOpen) return
  if (event.key === 'Escape') {
    event.preventDefault()
    ui.closeCommand()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="ui.commandOpen" class="palette-overlay" @mousedown.self="ui.closeCommand">
        <div class="palette" role="dialog" aria-modal="true" aria-label="全局搜索">
          <div class="palette__search">
            <Search :size="18" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="搜索公司、岗位、页面…"
              autocomplete="off"
            />
            <kbd>ESC</kbd>
          </div>

          <div class="palette__body">
            <div class="palette__label">
              {{ query ? '搜索结果' : '快速前往' }}
              <span>{{ filteredItems.length }} 项</span>
            </div>

            <div v-if="filteredItems.length" class="palette__results">
              <button
                v-for="(item, index) in filteredItems"
                :key="`${item.kind}-${item.id}`"
                type="button"
                class="palette__item"
                :class="{ 'is-active': selected === index }"
                @mouseenter="selected = index"
                @click="choose(index)"
              >
                <span class="palette__icon">
                  <component :is="item.icon" :size="16" />
                </span>
                <span class="palette__copy">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.meta }}</small>
                </span>
                <span class="palette__kind">{{ item.kind }}</span>
              </button>
            </div>

            <div v-else class="palette__empty">
              没有找到「{{ query }}」相关的内容
            </div>
          </div>

          <footer class="palette__footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
            <span><kbd>↵</kbd> 打开</span>
            <span class="palette__brand">OfferPilot Command</span>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 20px 20px;
  background: rgba(9, 24, 18, 0.5);
  backdrop-filter: blur(7px);
}

.palette {
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
}

.palette__search {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 62px;
  padding: 0 18px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}

.palette__search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 14px;
  color: var(--ink);
  background: transparent;
  border: 0;
  outline: none;
}

.palette__search input::placeholder {
  color: var(--faint);
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 21px;
  padding: 0 5px;
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 650;
  color: var(--faint);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 5px;
}

.palette__body {
  max-height: 52vh;
  padding: 10px;
  overflow-y: auto;
}

.palette__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 9px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--faint);
  text-transform: uppercase;
}

.palette__label span {
  letter-spacing: 0;
  text-transform: none;
}

.palette__results {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.palette__item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 10px;
}

.palette__item.is-active {
  background: var(--brand-soft);
}

.palette__icon {
  display: grid;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: var(--brand);
  background: color-mix(in srgb, var(--brand-soft) 80%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand) 12%, transparent);
  border-radius: 9px;
  place-items: center;
}

.palette__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.palette__copy strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__copy small {
  overflow: hidden;
  margin-top: 2px;
  font-size: 9.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__kind {
  flex-shrink: 0;
  font-size: 9px;
  color: var(--faint);
}

.palette__empty {
  padding: 40px 20px;
  font-size: 12px;
  color: var(--faint);
  text-align: center;
}

.palette__footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  font-size: 9px;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.palette__footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.palette__brand {
  margin-left: auto;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.2s ease;
}

.palette-enter-active .palette,
.palette-leave-active .palette {
  transition:
    transform 0.24s cubic-bezier(0.2, 0.75, 0.25, 1),
    opacity 0.2s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-from .palette,
.palette-leave-to .palette {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

@media (max-width: 640px) {
  .palette-overlay {
    padding: 8vh 12px 12px;
  }

  .palette__brand {
    display: none;
  }
}
</style>
