<script setup lang="ts">
import { Delete, Edit, MoreFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import CompanyAvatar from '@/components/common/CompanyAvatar.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { CHANNEL_META, PRIORITY_META } from '@/constants/meta'
import type { Application } from '@/types'
import { formatDate } from '@/utils/date'

defineProps<{
  items: Application[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [application: Application]
  delete: [application: Application]
}>()

function nextActionTone(application: Application): string {
  if (!application.nextActionAt) return ''
  const target = dayjs(application.nextActionAt).startOf('day')
  const today = dayjs().startOf('day')
  if (target.isBefore(today)) return 'is-overdue'
  if (target.isSame(today)) return 'is-today'
  return ''
}

function nextActionLabel(application: Application): string {
  if (!application.nextActionAt) return '—'
  const target = dayjs(application.nextActionAt).startOf('day')
  if (target.isBefore(dayjs().startOf('day'))) return `${formatDate(application.nextActionAt)} · 已逾期`
  if (target.isSame(dayjs().startOf('day'))) return '今天跟进'
  return formatDate(application.nextActionAt)
}

function handleCommand(command: string, application: Application): void {
  if (command === 'edit') emit('edit', application)
  if (command === 'delete') emit('delete', application)
}
</script>

<template>
  <div class="app-table">
    <div class="app-table__head">
      <span>公司 / 岗位</span>
      <span>状态</span>
      <span>渠道</span>
      <span>优先级</span>
      <span>投递日期</span>
      <span>下次跟进</span>
      <span />
    </div>

    <div v-if="loading" class="app-table__loading">
      <div v-for="index in 5" :key="index" class="skeleton app-skeleton" />
    </div>

    <template v-else-if="items.length">
      <div
        v-for="app in items"
        :key="app.id"
        class="app-row"
        role="button"
        tabindex="0"
        @click="emit('edit', app)"
        @keydown.enter="emit('edit', app)"
      >
        <div class="app-company">
          <CompanyAvatar :name="app.company" :size="38" :radius="11" />
          <div class="app-company__copy">
            <strong>{{ app.company }}</strong>
            <span>{{ app.position }}</span>
            <small>{{ app.location || '地点待补充' }}<template v-if="app.salary"> · {{ app.salary }}</template></small>
          </div>
        </div>

        <div class="app-cell"><StatusPill :status="app.status" compact /></div>
        <div class="app-cell app-channel">{{ CHANNEL_META[app.channel].label }}</div>
        <div class="app-cell app-priority">
          <span class="priority-dot" :style="{ background: PRIORITY_META[app.priority].color }" />
          {{ PRIORITY_META[app.priority].label.replace('优先级', '') }}
        </div>
        <div class="app-cell app-date">{{ formatDate(app.appliedAt, 'YYYY/MM/DD') }}</div>
        <div class="app-cell app-next" :class="nextActionTone(app)">
          <span class="app-next__label">下次跟进</span>
          {{ nextActionLabel(app) }}
        </div>

        <div class="app-actions" @click.stop>
          <el-dropdown trigger="click" @command="(command: string) => handleCommand(command, app)">
            <button class="row-menu" type="button" aria-label="更多操作">
              <MoreFilled :size="15" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit :size="13" style="margin-right: 7px" /> 编辑记录
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <Delete :size="13" style="margin-right: 7px" /> 删除记录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <EmptyState
      v-else
      title="没有符合条件的投递"
      description="换一个关键词或筛选条件，也可以直接记录一条新的投递。"
    />
  </div>
</template>

<style scoped>
.app-table {
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.app-table__head {
  display: grid;
  grid-template-columns: minmax(260px, 1.8fr) 104px 92px 86px 100px 108px 34px;
  gap: 12px;
  align-items: center;
  padding: 12px 20px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--faint);
  text-transform: uppercase;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--line);
}

.app-row {
  display: grid;
  grid-template-columns: minmax(260px, 1.8fr) 104px 92px 86px 100px 108px 34px;
  gap: 12px;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background 0.18s ease;
}

.app-row:last-child {
  border-bottom: 0;
}

.app-row:hover {
  background: var(--surface-soft);
}

.app-row:focus-visible {
  position: relative;
  z-index: 1;
  outline-offset: -2px;
}

.app-company {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.app-company__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-company__copy strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-company__copy span {
  overflow: hidden;
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-company__copy small {
  overflow: hidden;
  margin-top: 3px;
  font-size: 9px;
  color: var(--faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-cell {
  min-width: 0;
  font-size: 10px;
  color: var(--muted);
}

.app-priority {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
}

.priority-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.app-date {
  font-size: 9.5px;
  color: var(--faint);
}

.app-next {
  font-size: 9.5px;
  font-weight: 550;
}

.app-next__label {
  display: none;
}

.app-next.is-today {
  font-weight: 700;
  color: var(--coral);
}

.app-next.is-overdue {
  font-weight: 650;
  color: var(--danger);
}

.row-menu {
  display: grid;
  width: 28px;
  height: 28px;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 7px;
  place-items: center;
}

.row-menu:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.app-table__loading {
  padding: 10px 20px;
}

.app-skeleton {
  height: 58px;
  margin: 8px 0;
  border-radius: 10px;
}

@media (max-width: 1120px) {
  .app-table__head,
  .app-row {
    grid-template-columns: minmax(230px, 1.8fr) 100px 86px 92px 34px;
  }

  .app-table__head > :nth-child(4),
  .app-table__head > :nth-child(5),
  .app-row > :nth-child(4),
  .app-row > :nth-child(5) {
    display: none;
  }
}

@media (max-width: 760px) {
  .app-table {
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .app-table__head {
    display: none;
  }

  .app-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 10px;
    padding: 14px;
    margin-bottom: 9px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 15px;
    box-shadow: var(--shadow-xs);
  }

  .app-row:last-child {
    border-bottom: 1px solid var(--line);
  }

  .app-company {
    grid-column: 1;
    grid-row: 1;
  }

  .app-row > .app-cell:nth-child(2) {
    grid-column: 2;
    grid-row: 1;
  }

  .app-row > .app-cell:nth-child(3),
  .app-row > .app-cell:nth-child(4),
  .app-row > .app-cell:nth-child(5) {
    display: none;
  }

  .app-next {
    grid-column: 1;
    grid-row: 2;
    padding-left: 49px;
  }

  .app-next__label {
    display: inline;
    margin-right: 4px;
    font-weight: 500;
    color: var(--faint);
  }

  .app-actions {
    grid-column: 2;
    grid-row: 2;
  }

  .app-table__loading {
    padding: 0;
  }
}
</style>
