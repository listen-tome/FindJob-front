<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CircleCheck,
  Clock,
  Delete,
  Edit,
  Location,
  MoreFilled,
  OfficeBuilding,
  Phone,
  Plus,
  Refresh,
  VideoCamera,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import PageHeader from '@/components/common/PageHeader.vue'
import CompanyAvatar from '@/components/common/CompanyAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import InterviewFormDialog from '@/components/interviews/InterviewFormDialog.vue'
import { useInterviewStore } from '@/stores/interviews'
import { useApplicationStore } from '@/stores/applications'
import { INTERVIEW_STATUS_META, INTERVIEW_TYPE_META } from '@/constants/meta'
import type { Interview, InterviewStatus, InterviewType } from '@/types'
import {
  countdownLabel,
  formatDate,
  formatTime,
  relativeDay,
  weekdayLabel,
} from '@/utils/date'
import { clamp, formatPercent } from '@/utils/format'

const interviews = useInterviewStore()
const applications = useApplicationStore()

const loading = ref(true)
const error = ref('')
const cursor = ref(dayjs())
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const dialogOpen = ref(false)
const editing = ref<Interview | null>(null)
const presetDate = ref('')
const allFilter = ref<'UPCOMING' | 'COMPLETED' | 'ALL'>('UPCOMING')

const prepChecks = ref([
  { id: 'jd', label: '重读岗位 JD，圈出 3 个关键词', done: false },
  { id: 'story', label: '准备 2 个可深挖的项目故事', done: false },
  { id: 'question', label: '写下 3 个想问面试官的问题', done: false },
  { id: 'tech', label: '测试摄像头、麦克风与网络', done: false },
])

const typeIcon: Record<InterviewType, Component> = {
  PHONE: Phone,
  VIDEO: VideoCamera,
  ONSITE: OfficeBuilding,
}

const next = computed(() => interviews.nextInterview)
const monthLabel = computed(() => cursor.value.format('YYYY年 M月'))
const selectedDateLabel = computed(
  () => `${dayjs(selectedDate.value).format('M月D日')} · ${weekdayLabel(`${selectedDate.value}T12:00:00`)}`,
)
const selectedAgenda = computed(() => interviews.interviewsOn(selectedDate.value))
const prepDone = computed(() => prepChecks.value.filter((item) => item.done).length)
const prepPercent = computed(() =>
  clamp(Math.round((prepDone.value / prepChecks.value.length) * 100), 0, 100),
)

const thisWeekCount = computed(() => {
  const monday = dayjs().subtract((dayjs().day() + 6) % 7, 'day').startOf('day')
  const sunday = monday.add(7, 'day')
  return interviews.items.filter((interview) => {
    const date = dayjs(interview.scheduledAt)
    return (
      interview.status !== 'CANCELLED' &&
      !date.isBefore(monday) &&
      date.isBefore(sunday)
    )
  }).length
})

const completedCount = computed(
  () => interviews.items.filter((interview) => interview.status === 'COMPLETED').length,
)

const calendarCells = computed(() => {
  const monthStart = cursor.value.startOf('month')
  const offset = (monthStart.day() + 6) % 7
  const firstDay = monthStart.subtract(offset, 'day')
  return Array.from({ length: 42 }, (_, index) => {
    const date = firstDay.add(index, 'day')
    const key = date.format('YYYY-MM-DD')
    return {
      key,
      day: date.date(),
      inMonth: date.month() === cursor.value.month(),
      isToday: date.isSame(dayjs(), 'day'),
      isSelected: key === selectedDate.value,
      interviews: interviews.interviewsOn(key),
    }
  })
})

const filterCounts = computed(() => ({
  ALL: interviews.items.length,
  UPCOMING: interviews.upcoming.length,
  COMPLETED: completedCount.value,
}))

const filteredInterviews = computed(() => {
  let items = [...interviews.items]
  if (allFilter.value === 'UPCOMING') items = items.filter((item) => item.status === 'UPCOMING')
  if (allFilter.value === 'COMPLETED') items = items.filter((item) => item.status === 'COMPLETED')
  const direction = allFilter.value === 'UPCOMING' ? 1 : -1
  return items.sort(
    (a, b) => (dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf()) * direction,
  )
})

watch(next, () => {
  prepChecks.value = prepChecks.value.map((item) => ({ ...item, done: false }))
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await interviews.fetchAll(true)
    if (next.value) {
      cursor.value = dayjs(next.value.scheduledAt)
      selectedDate.value = dayjs(next.value.scheduledAt).format('YYYY-MM-DD')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '面试日程加载失败'
  } finally {
    loading.value = false
  }
}

function changeMonth(step: number): void {
  cursor.value = cursor.value.add(step, 'month').startOf('month')
}

function goToday(): void {
  cursor.value = dayjs()
  selectedDate.value = dayjs().format('YYYY-MM-DD')
}

function selectDay(key: string): void {
  selectedDate.value = key
  const date = dayjs(key)
  if (date.month() !== cursor.value.month()) cursor.value = date
}

function selectNextDay(): void {
  if (!next.value) return
  cursor.value = dayjs(next.value.scheduledAt)
  selectedDate.value = dayjs(next.value.scheduledAt).format('YYYY-MM-DD')
  document.querySelector('.agenda-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function openCreate(date = selectedDate.value): void {
  editing.value = null
  presetDate.value = date
  dialogOpen.value = true
}

function openEdit(interview: Interview): void {
  editing.value = interview
  dialogOpen.value = true
}

function handleSaved(interview: Interview): void {
  cursor.value = dayjs(interview.scheduledAt)
  selectedDate.value = dayjs(interview.scheduledAt).format('YYYY-MM-DD')
  // 新增面试会把关联投递推进到「面试中」，同步刷新投递看板的数据。
  void applications.fetchAll(true)
}

async function setStatus(interview: Interview, status: InterviewStatus): Promise<void> {
  try {
    await interviews.updateStatus(interview.id, status)
    const label = status === 'COMPLETED' ? '已标记为完成' : '面试已取消'
    ElMessage.success(`「${interview.company}」${label}`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '状态更新失败')
  }
}

async function handleDelete(interview: Interview): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除「${interview.company}」的${interview.round}安排？`,
      '删除面试日程',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await interviews.remove(interview.id)
    ElMessage.success('面试日程已删除')
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

function handleCommand(command: string, interview: Interview): void {
  if (command === 'edit') openEdit(interview)
  else if (command === 'complete') void setStatus(interview, 'COMPLETED')
  else if (command === 'cancel') void setStatus(interview, 'CANCELLED')
  else if (command === 'delete') void handleDelete(interview)
}

function togglePrep(id: string): void {
  prepChecks.value = prepChecks.value.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  )
}

function openMeeting(link: string): void {
  if (!link) {
    ElMessage.info('这场面试没有填写会议链接')
    return
  }
  window.open(link, '_blank', 'noopener,noreferrer')
}

onMounted(load)
</script>

<template>
  <div class="page interviews-page">
    <PageHeader
      eyebrow="INTERVIEW SCHEDULE"
      title="面试日程"
      description="把时间留出来，也把准备做在前面。每一次坐下来，都是更接近 Offer 的一步。"
    >
      <template #actions>
        <button class="btn btn--primary" type="button" @click="openCreate()">
          <Plus :size="15" />
          <span>安排面试</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="interview-skeleton">
      <div class="skeleton skeleton--overview" />
      <div class="skeleton skeleton--calendar" />
    </div>

    <div v-else-if="error" class="card error-card">
      <div class="error-card__icon"><Refresh :size="20" /></div>
      <h3>日程暂时没有加载出来</h3>
      <p>{{ error }}</p>
      <button class="btn btn--primary btn--sm" type="button" @click="load">重新加载</button>
    </div>

    <template v-else>
      <div class="interview-overview">
        <section class="next-panel">
          <div class="next-panel__glow" aria-hidden="true" />
          <div class="next-panel__main">
            <div class="next-panel__eyebrow">NEXT INTERVIEW</div>
            <template v-if="next">
              <div class="next-panel__company">
                <CompanyAvatar :name="next.company" :size="44" :radius="12" />
                <div>
                  <h2>{{ next.company }}</h2>
                  <p>{{ next.position }}</p>
                </div>
                <span class="next-panel__round">{{ next.round }}</span>
              </div>

              <div class="next-panel__meta">
                <span>
                  <Calendar :size="13" />
                  {{ formatDate(next.scheduledAt, 'M月D日') }} {{ weekdayLabel(next.scheduledAt) }}
                </span>
                <span>
                  <Clock :size="13" />
                  {{ formatTime(next.scheduledAt) }} · {{ next.durationMinutes }} 分钟
                </span>
                <span>
                  <component :is="typeIcon[next.type]" :size="13" />
                  {{ INTERVIEW_TYPE_META[next.type].label }}<template v-if="next.location"> · {{ next.location }}</template>
                </span>
              </div>

              <div class="next-panel__actions">
                <button
                  v-if="next.link"
                  type="button"
                  class="btn btn--accent btn--sm"
                  @click="openMeeting(next.link)"
                >
                  <VideoCamera :size="13" />
                  打开会议
                </button>
                <button type="button" class="next-panel__ghost" @click="selectNextDay">
                  查看准备清单
                  <ArrowRight :size="13" />
                </button>
              </div>
            </template>
            <template v-else>
              <h2 class="next-panel__empty-title">下一场面试，等你来安排。</h2>
              <p class="next-panel__empty-desc">收到面试邀请后，把时间记在这里，提前准备会更从容。</p>
              <button type="button" class="btn btn--accent btn--sm" @click="openCreate()">
                <Plus :size="13" />
                安排一场面试
              </button>
            </template>
          </div>

          <div v-if="next" class="next-panel__countdown">
            <span class="next-panel__countdown-label">{{ relativeDay(next.scheduledAt) }}</span>
            <strong class="num">{{ formatTime(next.scheduledAt) }}</strong>
            <span class="next-panel__countdown-date">{{ formatDate(next.scheduledAt, 'MM.DD') }}</span>
            <span class="next-panel__countdown-pill">{{ countdownLabel(next.scheduledAt) }}</span>
          </div>
        </section>

        <aside class="stat-panel">
          <div class="stat-panel__head">
            <span class="section-label">面试节奏</span>
            <span class="stat-panel__hint">近 7 天</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__icon stat-row__icon--coral"><Calendar :size="15" /></span>
            <span class="stat-row__copy"><strong>待参加</strong><small>接下来要准备的</small></span>
            <strong class="stat-row__value num">{{ interviews.upcoming.length }}</strong>
          </div>
          <div class="stat-row">
            <span class="stat-row__icon stat-row__icon--green"><Clock :size="15" /></span>
            <span class="stat-row__copy"><strong>本周安排</strong><small>已排期的面试</small></span>
            <strong class="stat-row__value num">{{ thisWeekCount }}</strong>
          </div>
          <div class="stat-row">
            <span class="stat-row__icon stat-row__icon--muted"><CircleCheck :size="15" /></span>
            <span class="stat-row__copy"><strong>已完成</strong><small>走完的面试轮次</small></span>
            <strong class="stat-row__value num">{{ completedCount }}</strong>
          </div>
          <div class="stat-panel__foot">
            <span class="stat-panel__bar"><i :style="{ width: `${Math.min(100, interviews.upcoming.length * 18 + 12)}%` }" /></span>
            保持节奏，比临时冲刺更有效
          </div>
        </aside>
      </div>

      <div class="interview-grid">
        <section class="card calendar-card">
          <div class="calendar-head">
            <div>
              <div class="card-head__title">面试日历</div>
              <div class="card-head__desc">点击日期查看当天安排</div>
            </div>
            <div class="calendar-nav">
              <button type="button" class="calendar-nav__today" @click="goToday">今天</button>
              <button type="button" class="calendar-nav__btn" aria-label="上个月" @click="changeMonth(-1)">
                <ArrowLeft :size="14" />
              </button>
              <span class="calendar-nav__month">{{ monthLabel }}</span>
              <button type="button" class="calendar-nav__btn" aria-label="下个月" @click="changeMonth(1)">
                <ArrowRight :size="14" />
              </button>
            </div>
          </div>

          <div class="calendar-weekdays">
            <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">{{ day }}</span>
          </div>

          <div class="calendar-grid">
            <button
              v-for="cell in calendarCells"
              :key="cell.key"
              type="button"
              class="calendar-day"
              :class="{
                'is-outside': !cell.inMonth,
                'is-today': cell.isToday,
                'is-selected': cell.isSelected,
              }"
              @click="selectDay(cell.key)"
            >
              <span class="calendar-day__num">{{ cell.day }}</span>
              <span class="calendar-day__events">
                <i
                  v-for="interview in cell.interviews.slice(0, 3)"
                  :key="interview.id"
                  :style="{
                    background:
                      interview.status === 'CANCELLED'
                        ? 'var(--line-strong)'
                        : INTERVIEW_STATUS_META[interview.status].color,
                  }"
                />
                <small v-if="cell.interviews.length > 3">+{{ cell.interviews.length - 3 }}</small>
              </span>
            </button>
          </div>

          <div class="calendar-legend">
            <span><i style="background: var(--coral)" /> 待参加</span>
            <span><i style="background: var(--brand)" /> 已完成</span>
            <span><i style="background: var(--line-strong)" /> 已取消</span>
          </div>
        </section>

        <aside class="side-stack">
          <section class="card agenda-card">
            <div class="card-head">
              <div>
                <div class="card-head__title">{{ selectedDateLabel }}</div>
                <div class="card-head__desc">
                  {{ selectedAgenda.length ? `${selectedAgenda.length} 场面试安排` : '这一天还没有安排' }}
                </div>
              </div>
              <button type="button" class="icon-btn icon-btn--quiet" aria-label="在当天添加面试" @click="openCreate()">
                <Plus :size="15" />
              </button>
            </div>

            <div v-if="selectedAgenda.length" class="agenda-list">
              <div
                v-for="interview in selectedAgenda"
                :key="interview.id"
                class="agenda-item"
                :class="{ 'is-done': interview.status === 'COMPLETED', 'is-cancelled': interview.status === 'CANCELLED' }"
              >
                <div class="agenda-time">
                  <strong class="num">{{ formatTime(interview.scheduledAt) }}</strong>
                  <span>{{ interview.durationMinutes }}min</span>
                </div>
                <span class="agenda-line" />
                <div class="agenda-copy">
                  <strong>{{ interview.company }}</strong>
                  <p>{{ interview.round }} · {{ interview.position }}</p>
                  <div class="agenda-tags">
                    <span>{{ INTERVIEW_TYPE_META[interview.type].label }}</span>
                    <span v-if="interview.location">{{ interview.location }}</span>
                  </div>
                </div>
                <el-dropdown trigger="click" @command="(command: string) => handleCommand(command, interview)">
                  <button type="button" class="agenda-menu" aria-label="面试操作">
                    <MoreFilled :size="14" />
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">
                        <Edit :size="13" style="margin-right: 7px" /> 编辑安排
                      </el-dropdown-item>
                      <el-dropdown-item v-if="interview.status === 'UPCOMING'" command="complete">
                        <Check :size="13" style="margin-right: 7px" /> 标记完成
                      </el-dropdown-item>
                      <el-dropdown-item v-if="interview.status === 'UPCOMING'" command="cancel">
                        <CircleCheck :size="13" style="margin-right: 7px" /> 取消面试
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <Delete :size="13" style="margin-right: 7px" /> 删除日程
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <EmptyState
              v-else
              title="这一天还很空"
              description="可以安排一场面试，或者留一点时间给准备。"
            >
              <template #action>
                <button type="button" class="btn btn--sm" @click="openCreate()">添加面试</button>
              </template>
            </EmptyState>
          </section>

          <section class="card prep-card">
            <div class="card-head">
              <div>
                <div class="card-head__title">面试准备清单</div>
                <div class="card-head__desc">把能控制的部分做到最好</div>
              </div>
              <span class="prep-percent num">{{ formatPercent(prepPercent) }}</span>
            </div>
            <div class="prep-bar" aria-hidden="true">
              <span :style="{ width: `${prepPercent}%` }" />
            </div>
            <div class="prep-list">
              <button
                v-for="item in prepChecks"
                :key="item.id"
                type="button"
                class="prep-item"
                :class="{ 'is-done': item.done }"
                @click="togglePrep(item.id)"
              >
                <span class="prep-check"><Check v-if="item.done" :size="11" /></span>
                {{ item.label }}
              </button>
            </div>
            <p v-if="next" class="prep-hint">
              为「{{ next.company }} · {{ next.round }}」准备 · {{ relativeDay(next.scheduledAt) }}
            </p>
          </section>
        </aside>
      </div>

      <section class="card all-card">
        <div class="all-head">
          <div>
            <div class="card-head__title">全部面试</div>
            <div class="card-head__desc">按时间查看所有面试记录</div>
          </div>
          <div class="filter-tabs">
            <button
              v-for="filter in [
                { key: 'UPCOMING' as const, label: '待参加' },
                { key: 'COMPLETED' as const, label: '已完成' },
                { key: 'ALL' as const, label: '全部' },
              ]"
              :key="filter.key"
              type="button"
              :class="{ 'is-active': allFilter === filter.key }"
              @click="allFilter = filter.key"
            >
              {{ filter.label }}
              <span class="num">{{ filterCounts[filter.key] }}</span>
            </button>
          </div>
        </div>

        <div v-if="filteredInterviews.length" class="all-list">
          <div
            v-for="interview in filteredInterviews"
            :key="interview.id"
            class="all-row"
            :class="{ 'is-cancelled': interview.status === 'CANCELLED' }"
          >
            <div class="all-date">
              <strong class="num">{{ formatDate(interview.scheduledAt, 'MM.DD') }}</strong>
              <small>{{ weekdayLabel(interview.scheduledAt) }} {{ formatTime(interview.scheduledAt) }}</small>
            </div>
            <div class="all-company">
              <CompanyAvatar :name="interview.company" :size="34" :radius="9" />
              <div>
                <strong>{{ interview.company }}</strong>
                <span>{{ interview.position }}</span>
              </div>
            </div>
            <div class="all-round">{{ interview.round }}</div>
            <div class="all-type">
              <component :is="typeIcon[interview.type]" :size="12" />
              {{ INTERVIEW_TYPE_META[interview.type].label }}
            </div>
            <div class="all-location">
              <Location :size="12" />
              <span>{{ interview.location || '待确认' }}</span>
            </div>
            <span
              class="all-status"
              :style="{
                color: INTERVIEW_STATUS_META[interview.status].color,
                background: INTERVIEW_STATUS_META[interview.status].soft,
              }"
            >
              {{ INTERVIEW_STATUS_META[interview.status].label }}
            </span>
            <el-dropdown trigger="click" @command="(command: string) => handleCommand(command, interview)">
              <button type="button" class="agenda-menu" aria-label="面试操作">
                <MoreFilled :size="14" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item v-if="interview.status === 'UPCOMING'" command="complete">标记完成</el-dropdown-item>
                  <el-dropdown-item v-if="interview.status === 'UPCOMING'" command="cancel">取消面试</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <EmptyState
          v-else
          title="还没有面试记录"
          description="当投递进入面试阶段，把它安排进日历，准备会更有方向。"
        >
          <template #action>
            <button type="button" class="btn btn--sm" @click="openCreate()">安排第一场面试</button>
          </template>
        </EmptyState>
      </section>
    </template>

    <InterviewFormDialog
      v-model="dialogOpen"
      :interview="editing"
      :preset-date="presetDate"
      @saved="handleSaved"
    />
  </div>
</template>

<style scoped>
.interview-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 14px;
  margin-bottom: 14px;
}

.next-panel {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 20px;
  min-height: 205px;
  padding: 25px 26px;
  overflow: hidden;
  color: #f2f6f1;
  background:
    radial-gradient(420px 260px at 82% 10%, rgba(217, 239, 111, 0.14), transparent 65%),
    linear-gradient(140deg, #154b3c 0%, #0d332a 60%, #09271f 100%);
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 44px rgba(10, 45, 33, 0.18);
}

.next-panel__glow {
  position: absolute;
  right: -120px;
  bottom: -160px;
  width: 360px;
  height: 360px;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
}

.next-panel__glow::after {
  position: absolute;
  inset: 34px;
  content: '';
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 50%;
}

.next-panel__main {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.next-panel__eyebrow {
  margin-bottom: 14px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.18em;
  color: rgba(224, 237, 225, 0.45);
}

.next-panel__company {
  display: flex;
  align-items: center;
  gap: 11px;
}

.next-panel__company h2 {
  font-size: 21px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: #f5f8f2;
}

.next-panel__company p {
  margin-top: 2px;
  font-size: 10px;
  color: rgba(230, 239, 231, 0.58);
}

.next-panel__round {
  padding: 4px 8px;
  margin-left: 3px;
  font-size: 8.5px;
  font-weight: 650;
  color: #d9ef6f;
  background: rgba(217, 239, 111, 0.1);
  border: 1px solid rgba(217, 239, 111, 0.16);
  border-radius: 5px;
}

.next-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 17px;
}

.next-panel__meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  color: rgba(231, 240, 232, 0.62);
}

.next-panel__meta svg {
  color: rgba(217, 239, 111, 0.7);
}

.next-panel__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 20px;
}

.next-panel__ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-size: 9.5px;
  font-weight: 600;
  color: rgba(240, 246, 240, 0.62);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.next-panel__ghost:hover {
  color: #fff;
}

.next-panel__countdown {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 138px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  backdrop-filter: blur(6px);
}

.next-panel__countdown-label {
  font-size: 9px;
  color: rgba(232, 242, 233, 0.52);
}

.next-panel__countdown strong {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 570;
  line-height: 1;
  letter-spacing: -0.055em;
  color: #f4f8f1;
}

.next-panel__countdown-date {
  margin-top: 5px;
  font-size: 8px;
  letter-spacing: 0.08em;
  color: rgba(230, 240, 231, 0.4);
}

.next-panel__countdown-pill {
  padding: 4px 8px;
  margin-top: 10px;
  font-size: 8.5px;
  font-weight: 650;
  color: #d9ef6f;
  background: rgba(217, 239, 111, 0.09);
  border-radius: 5px;
  white-space: nowrap;
}

.next-panel__empty-title {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.04em;
}

.next-panel__empty-desc {
  max-width: 360px;
  margin: 7px 0 18px;
  font-size: 10.5px;
  line-height: 1.6;
  color: rgba(230, 240, 231, 0.55);
}

.stat-panel {
  display: flex;
  flex-direction: column;
  padding: 20px 20px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.stat-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}

.stat-panel__hint {
  font-size: 8.5px;
  color: var(--faint);
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.stat-row:last-of-type {
  border-bottom: 0;
}

.stat-row__icon {
  display: grid;
  flex-shrink: 0;
  width: 31px;
  height: 31px;
  border-radius: 9px;
  place-items: center;
}

.stat-row__icon--coral {
  color: var(--coral);
  background: var(--coral-soft);
}

.stat-row__icon--green {
  color: var(--brand);
  background: var(--brand-soft);
}

.stat-row__icon--muted {
  color: var(--muted);
  background: var(--surface-soft);
}

.stat-row__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.stat-row__copy strong {
  font-size: 10.5px;
  font-weight: 650;
  color: var(--ink);
}

.stat-row__copy small {
  margin-top: 1px;
  font-size: 8px;
  color: var(--faint);
}

.stat-row__value {
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.stat-panel__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  margin-top: auto;
  font-size: 8px;
  color: var(--faint);
}

.stat-panel__bar {
  display: block;
  flex: 1;
  height: 4px;
  overflow: hidden;
  background: var(--surface-soft);
  border-radius: 99px;
}

.stat-panel__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #8cb95f);
  border-radius: inherit;
}

.interview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
  gap: 14px;
}

.calendar-card {
  padding: 22px 22px 16px;
}

.calendar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.calendar-nav__today {
  height: 26px;
  padding: 0 8px;
  margin-right: 4px;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.calendar-nav__today:hover {
  color: var(--brand);
  border-color: var(--brand-tint);
}

.calendar-nav__btn {
  display: grid;
  width: 26px;
  height: 26px;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  place-items: center;
}

.calendar-nav__btn:hover {
  color: var(--ink);
  background: var(--surface-soft);
}

.calendar-nav__month {
  min-width: 92px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.calendar-weekdays span {
  padding: 4px 0;
  font-size: 8.5px;
  font-weight: 600;
  color: var(--faint);
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 72px;
  padding: 7px 8px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.calendar-day:hover {
  background: var(--surface-soft);
}

.calendar-day.is-outside {
  opacity: 0.32;
}

.calendar-day.is-selected {
  background: var(--brand-soft);
  border-color: color-mix(in srgb, var(--brand) 18%, transparent);
}

.calendar-day.is-today .calendar-day__num {
  display: inline-grid;
  width: 20px;
  height: 20px;
  color: #fff;
  background: var(--brand);
  border-radius: 50%;
  place-items: center;
}

html.dark .calendar-day.is-today .calendar-day__num {
  color: #0b2119;
}

.calendar-day__num {
  font-size: 10px;
  font-weight: 650;
  color: var(--ink-soft);
}

.calendar-day__events {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 8px;
}

.calendar-day__events i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.calendar-day__events small {
  font-size: 7px;
  font-weight: 650;
  color: var(--faint);
}

.calendar-legend {
  display: flex;
  gap: 14px;
  padding-top: 12px;
  margin-top: 12px;
  font-size: 8px;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.calendar-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.calendar-legend i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.agenda-card {
  padding: 20px 18px 12px;
}

.agenda-list {
  display: flex;
  flex-direction: column;
}

.agenda-item {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}

.agenda-item:first-child {
  border-top: 0;
}

.agenda-item.is-done {
  opacity: 0.6;
}

.agenda-item.is-cancelled {
  opacity: 0.45;
}

.agenda-time {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 38px;
}

.agenda-time strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
}

.agenda-time span {
  margin-top: 2px;
  font-size: 8px;
  color: var(--faint);
}

.agenda-line {
  flex-shrink: 0;
  width: 2px;
  background: var(--coral-soft);
  border-radius: 99px;
}

.agenda-item:nth-child(2n) .agenda-line {
  background: var(--brand-soft);
}

.agenda-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.agenda-copy > strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}

.agenda-copy p {
  overflow: hidden;
  margin-top: 2px;
  font-size: 9px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.agenda-tags span {
  padding: 2px 5px;
  font-size: 7.5px;
  color: var(--faint);
  background: var(--surface-soft);
  border-radius: 3px;
}

.agenda-menu {
  display: grid;
  flex-shrink: 0;
  align-self: flex-start;
  width: 24px;
  height: 24px;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;
  place-items: center;
}

.agenda-menu:hover {
  color: var(--ink);
  background: var(--surface-soft);
}

.prep-card {
  padding: 20px 18px 16px;
}

.prep-percent {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand);
}

.prep-bar {
  height: 4px;
  margin: -7px 0 12px;
  overflow: hidden;
  background: var(--surface-soft);
  border-radius: 99px;
}

.prep-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #95ba58);
  border-radius: inherit;
  transition: width 0.35s ease;
}

.prep-list {
  display: flex;
  flex-direction: column;
}

.prep-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 9.5px;
  line-height: 1.5;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.prep-item.is-done {
  color: var(--faint);
  text-decoration: line-through;
}

.prep-check {
  display: grid;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: #fff;
  background: var(--surface);
  border: 1.3px solid var(--line-strong);
  border-radius: 5px;
  place-items: center;
}

.prep-item.is-done .prep-check {
  background: var(--brand);
  border-color: var(--brand);
}

.prep-hint {
  padding-top: 9px;
  margin-top: 5px;
  font-size: 8px;
  line-height: 1.5;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.all-card {
  padding: 22px 24px 10px;
  margin-top: 14px;
}

.all-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.filter-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 9px;
}

.filter-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 9px;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.filter-tabs button.is-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.filter-tabs button span {
  font-size: 8px;
  color: var(--faint);
}

.all-row {
  display: grid;
  grid-template-columns: 92px minmax(190px, 1.4fr) 110px 92px minmax(120px, 1fr) 80px 26px;
  gap: 12px;
  align-items: center;
  padding: 10px 4px;
  border-top: 1px solid var(--line);
}

.all-row.is-cancelled {
  opacity: 0.5;
}

.all-date {
  display: flex;
  flex-direction: column;
}

.all-date strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}

.all-date small {
  margin-top: 2px;
  font-size: 8px;
  color: var(--faint);
}

.all-company {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.all-company div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.all-company strong {
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 650;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-company span {
  overflow: hidden;
  margin-top: 1px;
  font-size: 8.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-round {
  font-size: 9px;
  color: var(--muted);
}

.all-type,
.all-location {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 8.5px;
  color: var(--muted);
}

.all-location span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-status {
  justify-self: start;
  padding: 4px 7px;
  font-size: 8px;
  font-weight: 650;
  white-space: nowrap;
  border-radius: 5px;
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 54px 24px;
  text-align: center;
}

.error-card__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 14px;
  color: var(--coral);
  background: var(--coral-soft);
  border-radius: 14px;
  place-items: center;
}

.error-card h3 {
  font-size: 15px;
}

.error-card p {
  margin: 6px 0 18px;
  font-size: 11px;
  color: var(--muted);
}

.skeleton--overview {
  height: 205px;
  margin-bottom: 14px;
  border-radius: var(--radius-lg);
}

.skeleton--calendar {
  height: 520px;
  border-radius: var(--radius-lg);
}

@media (max-width: 1180px) {
  .interview-overview,
  .interview-grid {
    grid-template-columns: 1fr;
  }

  .side-stack {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 980px) {
  .all-row {
    grid-template-columns: 84px minmax(180px, 1.4fr) 96px 80px 26px;
  }

  .all-row > :nth-child(4),
  .all-row > :nth-child(5) {
    display: none;
  }
}

@media (max-width: 760px) {
  .next-panel {
    flex-direction: column;
    padding: 20px;
  }

  .next-panel__countdown {
    align-items: flex-start;
    width: 100%;
    padding: 10px 14px;
  }

  .next-panel__countdown strong {
    font-size: 24px;
  }

  .next-panel__countdown-pill {
    position: absolute;
    right: 12px;
    bottom: 12px;
    margin-top: 0;
  }

  .side-stack {
    display: flex;
  }

  .calendar-card {
    padding: 18px 14px 12px;
  }

  .calendar-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .calendar-nav {
    width: 100%;
  }

  .calendar-nav__month {
    flex: 1;
  }

  .calendar-day {
    min-height: 55px;
    padding: 5px;
  }

  .calendar-day__num {
    font-size: 9px;
  }

  .calendar-day__events {
    gap: 2px;
    margin-top: 5px;
  }

  .calendar-day__events i {
    width: 4px;
    height: 4px;
  }

  .calendar-day__events small {
    display: none;
  }

  .all-card {
    padding: 18px 14px 8px;
  }

  .all-head {
    flex-direction: column;
    gap: 10px;
  }

  .all-row {
    grid-template-columns: 1fr auto;
    gap: 5px 8px;
    padding: 11px 2px;
  }

  .all-date {
    grid-column: 1;
    grid-row: 1;
  }

  .all-company {
    grid-column: 1;
    grid-row: 2;
  }

  .all-status {
    grid-column: 2;
    grid-row: 1;
  }

  .all-round {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
  }

  .all-type,
  .all-location,
  .all-row > :last-child {
    display: none;
  }
}
</style>
