<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Grid, List, Plus, Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import KanbanBoard from '@/components/applications/KanbanBoard.vue'
import ApplicationTable from '@/components/applications/ApplicationTable.vue'
import ApplicationFormDrawer from '@/components/applications/ApplicationFormDrawer.vue'
import { useApplicationStore } from '@/stores/applications'
import { useInterviewStore } from '@/stores/interviews'
import { CHANNEL_META, STATUS_META, STATUS_ORDER } from '@/constants/meta'
import type { Application, ApplicationChannel, ApplicationStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const applications = useApplicationStore()
const interviews = useInterviewStore()

const search = ref('')
const statusFilter = ref<ApplicationStatus | 'ALL'>('ALL')
const channelFilter = ref<ApplicationChannel | 'ALL'>('ALL')
const sortBy = ref('updatedAt,desc')
const viewMode = ref<'kanban' | 'list'>(
  localStorage.getItem('offerpilot.view') === 'list' ? 'list' : 'kanban',
)

const formOpen = ref(false)
const editing = ref<Application | null>(null)
const presetStatus = ref<ApplicationStatus>('WISHLIST')

const channelOptions = Object.entries(CHANNEL_META) as Array<
  [ApplicationChannel, (typeof CHANNEL_META)[ApplicationChannel]]
>

const summary = computed(() => [
  { key: 'ALL' as const, label: '全部', count: applications.items.length, color: '' },
  ...STATUS_ORDER.map((status) => ({
    key: status,
    label: STATUS_META[status].label,
    count: applications.statusCounts[status],
    color: STATUS_META[status].color,
  })),
])

const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  let result = [...applications.items]
  if (keyword) {
    result = result.filter((app) =>
      [app.company, app.position, app.location, app.tags.join(' '), app.notes]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }
  if (statusFilter.value !== 'ALL') {
    result = result.filter((app) => app.status === statusFilter.value)
  }
  if (channelFilter.value !== 'ALL') {
    result = result.filter((app) => app.channel === channelFilter.value)
  }
  const [field, direction = 'desc'] = sortBy.value.split(',')
  const factor = direction === 'asc' ? 1 : -1
  return result.sort((a, b) => {
    if (field === 'company') return a.company.localeCompare(b.company, 'zh-CN') * factor
    if (field === 'appliedAt') {
      return ((a.appliedAt ? new Date(a.appliedAt).getTime() : 0) - (b.appliedAt ? new Date(b.appliedAt).getTime() : 0)) * factor
    }
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * factor
  })
})

const description = computed(() => {
  if (applications.loading && !applications.loaded) return '正在整理你的投递记录…'
  const active = applications.statusCounts.APPLIED + applications.statusCounts.SCREENING + applications.statusCounts.INTERVIEW
  return `共 ${applications.total} 条记录，${active} 个流程正在进行。`
})

watch(viewMode, (value) => {
  localStorage.setItem('offerpilot.view', value)
})

function openCreate(status: ApplicationStatus = 'WISHLIST'): void {
  editing.value = null
  presetStatus.value = status
  formOpen.value = true
}

function openEdit(application: Application): void {
  editing.value = application
  formOpen.value = true
}

async function handleStatusChange(payload: { id: string; status: ApplicationStatus }): Promise<void> {
  const application = applications.byId(payload.id)
  if (!application || application.status === payload.status) return
  try {
    await applications.updateStatus(payload.id, payload.status)
    ElMessage.success(`「${application.company}」已移动到「${STATUS_META[payload.status].label}」`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '状态更新失败')
  }
}

async function handleDelete(application: Application): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `删除「${application.company}」的投递记录后，关联的面试日程也会一并移除。`,
      '确认删除这条投递？',
      {
        confirmButtonText: '删除记录',
        cancelButtonText: '再想想',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
    await applications.remove(application.id)
    // 后端会级联删除关联面试，刷新日程避免残留。
    void interviews.fetchAll(true)
    ElMessage.success('投递记录已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

async function syncQuery(): Promise<void> {
  if (!applications.loaded) return
  const editId = route.query.edit
  const isNew = route.query.new
  if (!editId && !isNew) return
  if (typeof editId === 'string') {
    const application = applications.byId(editId)
    if (application) openEdit(application)
    else ElMessage.warning('这条投递记录不存在或已被删除')
  } else if (isNew) {
    openCreate()
  }
  await router.replace({ path: '/applications' })
}

watch(
  () => applications.loaded,
  () => {
    void syncQuery()
  },
  { immediate: true },
)

watch(
  () => route.query,
  () => {
    void syncQuery()
  },
)

onMounted(async () => {
  await applications.fetchAll()
  await syncQuery()
})
</script>

<template>
  <div class="page applications-page">
    <PageHeader eyebrow="APPLICATION PIPELINE" title="投递管理" :description="description">
      <template #actions>
        <button class="btn" type="button" @click="viewMode = viewMode === 'kanban' ? 'list' : 'kanban'">
          <component :is="viewMode === 'kanban' ? List : Grid" :size="14" />
          <span>{{ viewMode === 'kanban' ? '列表视图' : '看板视图' }}</span>
        </button>
        <button class="btn btn--primary" type="button" @click="openCreate()">
          <Plus :size="15" />
          <span>新建投递</span>
        </button>
      </template>
    </PageHeader>

    <div class="status-summary">
      <button
        v-for="item in summary"
        :key="item.key"
        type="button"
        class="status-summary__item"
        :class="{ 'is-active': statusFilter === item.key }"
        @click="statusFilter = item.key"
      >
        <span v-if="item.color" class="status-summary__dot" :style="{ background: item.color }" />
        {{ item.label }}
        <strong class="num">{{ item.count }}</strong>
      </button>
    </div>

    <div class="app-toolbar">
      <div class="app-toolbar__left">
        <el-input v-model="search" class="toolbar-search" placeholder="搜索公司、岗位、标签…" clearable>
          <template #prefix><Search :size="14" /></template>
        </el-input>
        <el-select v-model="channelFilter" class="toolbar-select" placeholder="全部渠道">
          <el-option label="全部渠道" value="ALL" />
          <el-option
            v-for="[key, meta] in channelOptions"
            :key="key"
            :label="meta.label"
            :value="key"
          />
        </el-select>
        <el-select v-model="sortBy" class="toolbar-select toolbar-select--wide" placeholder="排序">
          <el-option label="最近更新" value="updatedAt,desc" />
          <el-option label="最近投递" value="appliedAt,desc" />
          <el-option label="公司名称" value="company,asc" />
        </el-select>
      </div>
      <div class="app-toolbar__right">
        <span class="result-count"><strong class="num">{{ filtered.length }}</strong> 条结果</span>
        <div class="view-switch" aria-label="视图切换">
          <button
            type="button"
            :class="{ 'is-active': viewMode === 'kanban' }"
            aria-label="看板视图"
            @click="viewMode = 'kanban'"
          >
            <Grid :size="14" />
          </button>
          <button
            type="button"
            :class="{ 'is-active': viewMode === 'list' }"
            aria-label="列表视图"
            @click="viewMode = 'list'"
          >
            <List :size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="applications.loading && !applications.loaded" class="board-skeleton">
      <div v-for="index in 4" :key="index" class="skeleton board-skeleton__col" />
    </div>

    <KanbanBoard
      v-else-if="viewMode === 'kanban'"
      :items="filtered"
      @edit="openEdit"
      @create="openCreate"
      @delete="handleDelete"
      @status-change="handleStatusChange"
    />

    <ApplicationTable
      v-else
      :items="filtered"
      :loading="applications.loading"
      @edit="openEdit"
      @delete="handleDelete"
    />

    <div v-if="viewMode === 'kanban'" class="board-hint">
      <span class="board-hint__dot" />
      小提示：拖动卡片到新的列，就能同步更新投递状态
      <button type="button" @click="openCreate()">
        <Plus :size="12" /> 快速添加
      </button>
    </div>

    <ApplicationFormDrawer
      v-model="formOpen"
      :application="editing"
      :preset-status="presetStatus"
      @saved="syncQuery"
    />
  </div>
</template>

<style scoped>
.status-summary {
  display: flex;
  gap: 2px;
  padding: 5px;
  margin-bottom: 12px;
  overflow-x: auto;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 13px;
  scrollbar-width: none;
}

.status-summary::-webkit-scrollbar {
  display: none;
}

.status-summary__item {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 9px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.status-summary__item:hover {
  color: var(--ink);
}

.status-summary__item.is-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.status-summary__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.status-summary__item strong {
  font-size: 9px;
  font-weight: 700;
  color: var(--faint);
}

.status-summary__item.is-active strong {
  color: var(--brand);
}

.app-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 2px 0 14px;
}

.app-toolbar__left,
.app-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-toolbar__left {
  flex: 1;
  min-width: 0;
}

.toolbar-search {
  width: min(270px, 100%);
}

.toolbar-search :deep(.el-input__wrapper) {
  height: 36px;
  min-height: 36px;
  background: var(--surface);
}

.toolbar-select {
  width: 124px;
}

.toolbar-select--wide {
  width: 116px;
}

.toolbar-select :deep(.el-select__wrapper) {
  min-height: 36px;
  background: var(--surface);
  font-size: 11px;
}

.result-count {
  font-size: 9.5px;
  color: var(--faint);
  white-space: nowrap;
}

.result-count strong {
  font-weight: 700;
  color: var(--muted);
}

.view-switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 9px;
}

.view-switch button {
  display: grid;
  width: 28px;
  height: 27px;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  place-items: center;
}

.view-switch button:hover {
  color: var(--ink);
}

.view-switch button.is-active {
  color: var(--brand);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.board-skeleton {
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.board-skeleton__col {
  flex: 0 0 276px;
  height: 520px;
  border-radius: 17px;
}

.board-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 13px 3px 0;
  font-size: 9px;
  color: var(--faint);
}

.board-hint__dot {
  width: 4px;
  height: 4px;
  background: var(--brand);
  border-radius: 50%;
}

.board-hint button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  margin-left: auto;
  font-size: 9px;
  font-weight: 600;
  color: var(--brand);
  cursor: pointer;
  background: transparent;
  border: 0;
}

@media (max-width: 980px) {
  .app-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .app-toolbar__left {
    width: 100%;
  }

  .app-toolbar__right {
    width: 100%;
  }

  .result-count {
    margin-right: auto;
  }
}

@media (max-width: 760px) {
  .status-summary {
    margin-right: -16px;
    margin-left: -16px;
    padding-right: 16px;
    padding-left: 16px;
    background: transparent;
    border: 0;
    border-radius: 0;
  }

  .status-summary__item {
    height: 31px;
    padding: 0 10px;
    background: var(--surface);
    border: 1px solid var(--line);
  }

  .status-summary__item.is-active {
    color: #fff;
    background: var(--brand);
    border-color: var(--brand);
  }

  .status-summary__item.is-active strong {
    color: var(--accent);
  }

  .app-toolbar__left {
    flex-wrap: wrap;
  }

  .toolbar-search {
    width: 100%;
  }

  .toolbar-select {
    flex: 1;
    width: auto;
  }

  .toolbar-select--wide {
    flex: 0 0 104px;
    width: 104px;
  }

  .board-skeleton__col {
    flex-basis: 255px;
    height: 440px;
  }

  .board-hint {
    display: none;
  }
}
</style>
