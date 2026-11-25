<script setup lang="ts">
import { ref } from 'vue'
import { Delete, Edit, MoreFilled, Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import CompanyAvatar from '@/components/common/CompanyAvatar.vue'
import { STATUS_META, STATUS_ORDER } from '@/constants/meta'
import type { Application, ApplicationStatus } from '@/types'
import { relativeDay } from '@/utils/date'

defineProps<{
  items: Application[]
}>()

const emit = defineEmits<{
  edit: [application: Application]
  create: [status: ApplicationStatus]
  delete: [application: Application]
  'status-change': [payload: { id: string; status: ApplicationStatus }]
}>()

const draggingId = ref('')
const dragOverStatus = ref<ApplicationStatus | null>(null)

function itemsFor(status: ApplicationStatus, items: Application[]): Application[] {
  return items.filter((app) => app.status === status)
}

function onDragStart(event: DragEvent, application: Application): void {
  draggingId.value = application.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', application.id)
  }
}

function onDragOver(event: DragEvent, status: ApplicationStatus): void {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverStatus.value = status
}

function onDrop(event: DragEvent, status: ApplicationStatus): void {
  event.preventDefault()
  const id = event.dataTransfer?.getData('text/plain') || draggingId.value
  dragOverStatus.value = null
  draggingId.value = ''
  if (!id) return
  emit('status-change', { id, status })
}

function onDragEnd(): void {
  draggingId.value = ''
  dragOverStatus.value = null
}

function handleCommand(command: string, application: Application): void {
  if (command === 'edit') emit('edit', application)
  if (command === 'delete') emit('delete', application)
}
</script>

<template>
  <div class="kanban">
    <section
      v-for="status in STATUS_ORDER"
      :key="status"
      class="kanban-col"
      :class="{ 'is-rejected': status === 'REJECTED' }"
    >
      <header class="kanban-col__head">
        <span class="kanban-col__dot" :style="{ background: STATUS_META[status].color }" />
        <strong>{{ STATUS_META[status].label }}</strong>
        <span class="kanban-col__count num">{{ itemsFor(status, items).length }}</span>
        <button
          class="kanban-col__add"
          type="button"
          :aria-label="`新建${STATUS_META[status].label}`"
          @click="emit('create', status)"
        >
          <Plus :size="14" />
        </button>
      </header>

      <div
        class="kanban-col__body"
        :class="{ 'is-over': dragOverStatus === status && draggingId }"
        @dragover="onDragOver($event, status)"
        @dragleave="dragOverStatus = null"
        @drop="onDrop($event, status)"
      >
        <article
          v-for="app in itemsFor(status, items)"
          :key="app.id"
          class="kanban-card"
          :class="{ 'is-dragging': draggingId === app.id }"
          draggable="true"
          @dragstart="onDragStart($event, app)"
          @dragend="onDragEnd"
          @click="emit('edit', app)"
        >
          <div class="kanban-card__top">
            <CompanyAvatar :name="app.company" :size="34" :radius="9" />
            <div class="kanban-card__copy">
              <strong>{{ app.company }}</strong>
              <span>{{ app.position }}</span>
            </div>
            <div class="kanban-card__menu" @click.stop @mousedown.stop>
              <el-dropdown trigger="click" @command="(command: string) => handleCommand(command, app)">
                <button class="card-menu" type="button" aria-label="更多操作">
                  <MoreFilled :size="14" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">
                      <Edit :size="13" style="margin-right: 7px" /> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <Delete :size="13" style="margin-right: 7px" /> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="kanban-card__meta">
            <span>{{ app.location || '地点待定' }}</span>
            <span v-if="app.salary">{{ app.salary }}</span>
          </div>

          <div v-if="app.tags.length" class="kanban-card__tags">
            <span v-for="tag in app.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
          </div>

          <div class="kanban-card__foot">
            <span class="kanban-card__date">
              {{ app.appliedAt ? relativeDay(app.appliedAt) + '投递' : '尚未投递' }}
            </span>
            <span
              v-if="app.nextActionAt"
              class="kanban-card__next"
              :class="{
                'is-overdue': dayjs(app.nextActionAt).isBefore(dayjs(), 'day'),
                'is-today': dayjs(app.nextActionAt).isSame(dayjs(), 'day'),
              }"
            >
              {{
                dayjs(app.nextActionAt).isSame(dayjs(), 'day')
                  ? '今天跟进'
                  : relativeDay(app.nextActionAt) + '跟进'
              }}
            </span>
          </div>
        </article>

        <div v-if="!itemsFor(status, items).length" class="kanban-col__empty">
          <span class="kanban-col__empty-icon">
            <Plus :size="14" />
          </span>
          拖拽卡片到这里，或新建一条
        </div>
      </div>

      <button class="kanban-col__foot" type="button" @click="emit('create', status)">
        <Plus :size="13" />
        添加投递
      </button>
    </section>
  </div>
</template>

<style scoped>
.kanban {
  display: flex;
  gap: 12px;
  padding: 2px 2px 16px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.kanban-col {
  display: flex;
  flex: 0 0 276px;
  flex-direction: column;
  min-height: 560px;
  padding: 12px;
  background: color-mix(in srgb, var(--surface-soft) 74%, transparent);
  border: 1px solid var(--line);
  border-radius: 17px;
  scroll-snap-align: start;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.kanban-col:has(.kanban-col__body.is-over) {
  background: var(--brand-soft);
  border-color: color-mix(in srgb, var(--brand) 30%, var(--line));
}

.kanban-col.is-rejected {
  opacity: 0.86;
}

.kanban-col__head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 3px 11px;
}

.kanban-col__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.kanban-col__head strong {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ink);
}

.kanban-col__count {
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 650;
  color: var(--faint);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.kanban-col__add {
  display: grid;
  width: 24px;
  height: 24px;
  margin-left: auto;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  place-items: center;
}

.kanban-col__add:hover {
  color: var(--brand);
  background: var(--brand-soft);
}

.kanban-col__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  padding: 2px;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.kanban-col__body.is-over {
  background: color-mix(in srgb, var(--brand) 6%, transparent);
  outline: 1px dashed color-mix(in srgb, var(--brand) 40%, transparent);
  outline-offset: 2px;
}

.kanban-card {
  padding: 12px;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 13px;
  box-shadow: var(--shadow-xs);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease;
}

.kanban-card:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.kanban-card.is-dragging {
  opacity: 0.35;
  transform: rotate(1deg) scale(0.98);
}

.kanban-card__top {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.kanban-card__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.kanban-card__copy strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-card__copy span {
  overflow: hidden;
  margin-top: 2px;
  font-size: 9.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-card__menu {
  margin: -4px -4px 0 0;
}

.card-menu {
  display: grid;
  width: 23px;
  height: 23px;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;
  place-items: center;
}

.card-menu:hover {
  color: var(--ink);
  background: var(--surface-soft);
}

.kanban-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 9px 0 0 43px;
  font-size: 8.5px;
  color: var(--faint);
}

.kanban-card__meta span + span::before {
  margin-right: 8px;
  content: '·';
}

.kanban-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.kanban-card__tags span {
  padding: 2px 5px;
  font-size: 8px;
  font-weight: 550;
  color: var(--muted);
  background: var(--surface-soft);
  border-radius: 4px;
}

.kanban-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--line);
}

.kanban-card__date {
  font-size: 8px;
  color: var(--faint);
}

.kanban-card__next {
  font-size: 8px;
  font-weight: 650;
  color: var(--muted);
}

.kanban-card__next.is-today {
  color: var(--coral);
}

.kanban-card__next.is-overdue {
  color: var(--danger);
}

.kanban-col__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 96px;
  padding: 18px 12px;
  font-size: 9px;
  line-height: 1.5;
  color: var(--faint);
  text-align: center;
  border: 1px dashed var(--line-strong);
  border-radius: 11px;
}

.kanban-col__empty-icon {
  display: grid;
  width: 24px;
  height: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 7px;
  place-items: center;
}

.kanban-col__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  height: 31px;
  margin-top: 9px;
  font-size: 9px;
  font-weight: 600;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 1px dashed transparent;
  border-radius: 8px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

.kanban-col__foot:hover {
  color: var(--brand);
  background: var(--surface);
  border-color: var(--line);
}

@media (max-width: 760px) {
  .kanban {
    gap: 9px;
    margin: 0 -16px;
    padding: 0 16px 16px;
  }

  .kanban-col {
    flex-basis: 255px;
    min-height: 480px;
  }
}
</style>
