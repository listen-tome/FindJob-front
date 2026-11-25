<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Calendar,
  ChatLineSquare,
  Clock,
  Collection,
  Document,
  Plus,
  Refresh,
  Trophy,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import MetricCard from '@/components/common/MetricCard.vue'
import CompanyAvatar from '@/components/common/CompanyAvatar.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import FunnelBars from '@/components/charts/FunnelBars.vue'
import { dashboardApi } from '@/api'
import type { DashboardData, DashboardTask } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { CHANNEL_META, INTERVIEW_TYPE_META } from '@/constants/meta'
import { formatDate, formatTime, greeting, relativeDay, weekdayLabel } from '@/utils/date'
import { clamp, formatPercent } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')
const doneTasks = ref<string[]>([])

const todayLabel = computed(() => dayjs().format('M月D日') + ' · ' + weekdayLabel(dayjs().toISOString()))
const firstName = computed(() => auth.user?.name || '同学')
const nextInterview = computed(() => data.value?.upcomingInterviews[0] ?? null)
const todayInterviewCount = computed(
  () =>
    data.value?.upcomingInterviews.filter((interview) => dayjs(interview.scheduledAt).isSame(dayjs(), 'day'))
      .length ?? 0,
)
const pendingTasks = computed(() => data.value?.tasks.length ?? 0)
const weeklyPercent = computed(() => {
  if (!data.value) return 0
  const { applied, target } = data.value.metrics.weekly
  return clamp(Math.round((applied / Math.max(target, 1)) * 100), 0, 100)
})
const weeklyRemaining = computed(() => {
  if (!data.value) return 0
  return Math.max(data.value.metrics.weekly.target - data.value.metrics.weekly.applied, 0)
})
const sparkValues = computed(() => data.value?.trend.map((point) => point.applications) ?? [])
const trendInsight = computed(() => {
  if (!data.value) return ''
  const points = data.value.trend
  const recent = points.slice(-7).reduce((sum, point) => sum + point.applications, 0)
  const previous = points.slice(0, 7).reduce((sum, point) => sum + point.applications, 0)
  if (!previous) return '开始记录后，这里会呈现你的投递节奏。'
  const diff = recent - previous
  if (diff > 0) return `最近 7 天比前一周多投了 ${diff} 次，节奏正在加快。`
  if (diff < 0) return `最近 7 天比前一周少投了 ${Math.abs(diff)} 次，可以适当补上节奏。`
  return '最近两周投递节奏稳定，保持住这个频率。'
})
const activeTaskIcon = (kind: DashboardTask['kind']) => {
  if (kind === 'INTERVIEW') return Calendar
  if (kind === 'FOLLOW_UP') return ChatLineSquare
  return Document
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardApi.get()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '工作台加载失败'
  } finally {
    loading.value = false
  }
}

function toggleTask(id: string): void {
  doneTasks.value = doneTasks.value.includes(id)
    ? doneTasks.value.filter((item) => item !== id)
    : [...doneTasks.value, id]
}

function openApplication(id: string): void {
  router.push({ path: '/applications', query: { edit: id } })
}

onMounted(load)
</script>

<template>
  <div class="page dashboard">
    <header class="dash-head">
      <div class="dash-head__copy">
        <div class="page-head__eyebrow">{{ todayLabel }}</div>
        <h1>{{ greeting() }}，{{ firstName }}<span class="dash-head__dot">.</span></h1>
        <p class="dash-head__desc">
          今天有
          <strong>{{ todayInterviewCount }}</strong>
          场面试、<strong>{{ pendingTasks }}</strong>
          件待办。{{ nextInterview ? `下一场是「${nextInterview.company}」${nextInterview.round}。` : '给自己留一点准备的时间。' }}
        </p>
        <div class="dash-head__actions">
          <RouterLink to="/applications?new=1" class="btn btn--primary">
            <Plus :size="15" />
            记录新投递
          </RouterLink>
          <RouterLink to="/analytics" class="btn btn--ghost">
            查看分析
            <ArrowRight :size="14" />
          </RouterLink>
        </div>
      </div>

      <div class="weekly-card">
        <div class="weekly-ring">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="29" fill="none" stroke="var(--line)" stroke-width="6" />
            <circle
              cx="36"
              cy="36"
              r="29"
              fill="none"
              stroke="var(--brand)"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="`${(2 * Math.PI * 29 * weeklyPercent) / 100} ${2 * Math.PI * 29}`"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span class="weekly-ring__value num">{{ weeklyPercent }}<small>%</small></span>
        </div>
        <div class="weekly-card__copy">
          <span class="section-label">本周投递目标</span>
          <strong class="num">
            {{ data?.metrics.weekly.applied ?? 0 }}
            <small>/ {{ data?.metrics.weekly.target ?? 0 }}</small>
          </strong>
          <p>{{ weeklyRemaining ? `再投 ${weeklyRemaining} 次就达标` : '目标达成，保持节奏' }}</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="dash-skeleton">
      <div class="metrics-grid">
        <div v-for="index in 4" :key="index" class="skeleton skeleton--metric" />
      </div>
      <div class="dash-grid">
        <div class="skeleton skeleton--hero" />
        <div class="skeleton skeleton--side" />
        <div class="skeleton skeleton--mid" />
        <div class="skeleton skeleton--mid" />
      </div>
    </div>

    <div v-else-if="error" class="card error-card">
      <div class="error-card__icon"><Refresh :size="20" /></div>
      <h3>工作台暂时没有加载出来</h3>
      <p>{{ error }}</p>
      <button class="btn btn--primary btn--sm" type="button" @click="load">重新加载</button>
    </div>

    <template v-else-if="data">
      <div class="metrics-grid">
        <MetricCard
          label="累计投递"
          :value="data.metrics.total.value"
          :delta="data.metrics.total.delta"
          note="本周新增"
          :icon="Collection"
          :spark="sparkValues"
        />
        <MetricCard
          label="进行中"
          :value="data.metrics.active.value"
          :delta="data.metrics.active.delta"
          note="近 7 天有更新"
          :icon="Clock"
          tone="blue"
          :spark="[3, 4, 3, 5, 5, 6, 4, 7]"
        />
        <MetricCard
          label="待参加面试"
          :value="data.metrics.interviews.value"
          :delta="data.metrics.interviews.delta"
          note="未来日程"
          :icon="Calendar"
          tone="coral"
          :spark="[1, 2, 2, 3, 2, 4, 3, 4]"
        />
        <MetricCard
          label="已获 Offer"
          :value="data.metrics.offers.value"
          :delta="data.metrics.offers.delta"
          note="继续加油"
          :icon="Trophy"
          tone="amber"
          :spark="[0, 0, 1, 1, 1, 1, 2, 2]"
        />
      </div>

      <div class="dash-grid">
        <section class="card trend-card">
          <div class="card-head">
            <div>
              <div class="card-head__title">投递节奏</div>
              <div class="card-head__desc">近 14 天的投递与面试安排</div>
            </div>
            <span class="chart-badge">14 DAYS</span>
          </div>
          <TrendChart :data="data.trend" :height="238" />
          <div class="trend-note">
            <span class="trend-note__mark" />
            {{ trendInsight }}
          </div>
        </section>

        <aside class="card task-card">
          <div class="card-head">
            <div>
              <div class="card-head__title">今日待办</div>
              <div class="card-head__desc">把注意力放在下一步</div>
            </div>
            <span class="task-count">{{ doneTasks.length }}/{{ pendingTasks }}</span>
          </div>

          <div v-if="data.tasks.length" class="task-list">
            <button
              v-for="task in data.tasks"
              :key="task.id"
              type="button"
              class="task-item"
              :class="{ 'is-done': doneTasks.includes(task.id) }"
              @click="toggleTask(task.id)"
            >
              <span class="task-check">
                <svg v-if="doneTasks.includes(task.id)" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 6.2l2.2 2.1 4.7-4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="task-copy">
                <strong>{{ task.title }}</strong>
                <small>{{ task.meta }}</small>
              </span>
              <span class="task-icon">
                <component :is="activeTaskIcon(task.kind)" :size="14" />
              </span>
            </button>
          </div>
          <EmptyState v-else title="今天没有待办" description="可以提前看看目标岗位，或给简历做一次小优化。" />

          <button class="task-add" type="button" @click="router.push('/interviews')">
            <Calendar :size="13" />
            去安排一场面试
            <ArrowRight :size="13" />
          </button>
        </aside>

        <section class="card funnel-card">
          <div class="card-head">
            <div>
              <div class="card-head__title">投递转化</div>
              <div class="card-head__desc">从投递到 Offer 的每一步</div>
            </div>
            <span class="funnel-rate">{{ data.metrics.responseRate.value }}% <small>回复率</small></span>
          </div>
          <FunnelBars :items="data.funnel" />
          <div class="funnel-foot">
            <span>回复率</span>
            <strong>{{ formatPercent(data.metrics.responseRate.value, 1) }}</strong>
            <span class="funnel-foot__delta" :class="{ 'is-up': data.metrics.responseRate.delta >= 0 }">
              {{ data.metrics.responseRate.delta >= 0 ? '+' : '' }}{{ data.metrics.responseRate.delta }}pp
            </span>
            <span class="funnel-foot__hint">较上一周期</span>
          </div>
        </section>

        <section class="card interview-card">
          <div class="card-head">
            <div>
              <div class="card-head__title">近期面试</div>
              <div class="card-head__desc">准备好，再出发</div>
            </div>
            <RouterLink to="/interviews" class="card-link">
              全部日程 <ArrowRight :size="12" />
            </RouterLink>
          </div>

          <div v-if="data.upcomingInterviews.length" class="upcoming-list">
            <button
              v-for="interview in data.upcomingInterviews"
              :key="interview.id"
              type="button"
              class="upcoming-item"
              @click="router.push('/interviews')"
            >
              <span class="upcoming-date">
                <strong class="num">{{ formatDate(interview.scheduledAt, 'DD') }}</strong>
                <small>{{ formatDate(interview.scheduledAt, 'MMM') }}</small>
              </span>
              <span class="upcoming-main">
                <span class="upcoming-company">
                  <strong>{{ interview.company }}</strong>
                  <span class="upcoming-round">{{ interview.round }}</span>
                </span>
                <small>{{ interview.position }}</small>
              </span>
              <span class="upcoming-time">
                <strong>{{ relativeDay(interview.scheduledAt) }}</strong>
                <small>{{ formatTime(interview.scheduledAt) }} · {{ INTERVIEW_TYPE_META[interview.type].label }}</small>
              </span>
              <span class="upcoming-arrow"><ArrowRight :size="14" /></span>
            </button>
          </div>
          <EmptyState
            v-else
            title="暂时没有面试安排"
            description="持续投递并记录进度，面试邀请会在这里出现。"
          >
            <template #action>
              <button class="btn btn--sm" type="button" @click="router.push('/applications')">查看投递</button>
            </template>
          </EmptyState>
        </section>

        <section class="card recent-card">
          <div class="card-head">
            <div>
              <div class="card-head__title">最近更新</div>
              <div class="card-head__desc">刚刚有动静的投递记录</div>
            </div>
            <RouterLink to="/applications" class="card-link">
              打开投递看板 <ArrowRight :size="12" />
            </RouterLink>
          </div>

          <div class="recent-table">
            <div class="recent-row recent-row--head">
              <span>公司 / 岗位</span>
              <span>状态</span>
              <span>渠道</span>
              <span>最近更新</span>
              <span />
            </div>
            <button
              v-for="app in data.recentApplications"
              :key="app.id"
              type="button"
              class="recent-row"
              @click="openApplication(app.id)"
            >
              <span class="recent-company">
                <CompanyAvatar :name="app.company" :size="34" :radius="10" />
                <span>
                  <strong>{{ app.company }}</strong>
                  <small>{{ app.position }}</small>
                </span>
              </span>
              <span><StatusPill :status="app.status" compact /></span>
              <span class="recent-channel">{{ CHANNEL_META[app.channel].label }}</span>
              <span class="recent-updated">{{ formatDate(app.updatedAt, 'M月D日') }}</span>
              <span class="recent-arrow"><ArrowRight :size="14" /></span>
            </button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding: 14px 0 30px;
}

.dash-head__copy {
  min-width: 0;
}

.dash-head h1 {
  font-family: var(--font-display);
  font-size: clamp(31px, 3.2vw, 42px);
  font-weight: 620;
  line-height: 1.12;
  letter-spacing: -0.055em;
  color: var(--ink);
}

.dash-head__dot {
  color: var(--brand);
}

.dash-head__desc {
  max-width: 620px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
}

.dash-head__desc strong {
  font-weight: 750;
  color: var(--ink-soft);
}

.dash-head__actions {
  display: flex;
  gap: 8px;
  margin-top: 21px;
}

.weekly-card {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 15px;
  min-width: 252px;
  padding: 14px 17px 14px 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-xs);
}

.weekly-ring {
  position: relative;
  display: grid;
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  place-items: center;
}

.weekly-ring svg {
  width: 100%;
  height: 100%;
}

.weekly-ring svg circle {
  transition: stroke-dasharray 0.6s ease;
}

.weekly-ring__value {
  position: absolute;
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.weekly-ring__value small {
  font-size: 8px;
  font-weight: 600;
  color: var(--muted);
}

.weekly-card__copy {
  display: flex;
  flex-direction: column;
}

.weekly-card__copy strong {
  margin-top: 3px;
  font-size: 21px;
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.weekly-card__copy strong small {
  font-size: 10px;
  font-weight: 550;
  color: var(--faint);
}

.weekly-card__copy p {
  margin-top: 3px;
  font-size: 9px;
  color: var(--muted);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dash-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.trend-card {
  grid-column: span 8;
  padding: 22px 24px 18px;
}

.task-card {
  display: flex;
  grid-column: span 4;
  flex-direction: column;
  padding: 22px 20px 16px;
}

.chart-badge {
  padding: 5px 8px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
  color: var(--muted);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 5px;
}

.trend-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 13px;
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.5;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

.trend-note__mark {
  width: 5px;
  height: 5px;
  background: var(--brand);
  border-radius: 50%;
}

.task-count {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  font-size: 9px;
  font-weight: 650;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: 5px;
}

.task-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  padding: 10px 3px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
}

.task-item:first-child {
  border-top: 0;
}

.task-check {
  display: grid;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  color: #fff;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  place-items: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.task-check svg {
  width: 11px;
  height: 11px;
}

.task-item:hover .task-check {
  border-color: var(--brand);
}

.task-item.is-done .task-check {
  background: var(--brand);
  border-color: var(--brand);
}

.task-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.task-copy strong {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink-soft);
}

.task-copy small {
  margin-top: 2px;
  font-size: 9px;
  color: var(--faint);
}

.task-item.is-done .task-copy strong {
  color: var(--faint);
  text-decoration: line-through;
}

.task-icon {
  display: grid;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: -2px;
  color: var(--muted);
  background: var(--surface-soft);
  border-radius: 7px;
  place-items: center;
}

.task-add {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 2px 2px;
  margin-top: 6px;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--brand);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
}

.task-add svg:last-child {
  margin-left: auto;
}

.funnel-card {
  grid-column: span 5;
  padding: 22px 24px;
}

.funnel-rate {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand);
}

.funnel-rate small {
  font-size: 8px;
  font-weight: 500;
  color: var(--muted);
}

.funnel-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 14px;
  margin-top: 18px;
  font-size: 9.5px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

.funnel-foot strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
}

.funnel-foot__delta {
  padding: 2px 5px;
  font-size: 8.5px;
  font-weight: 650;
  color: var(--coral);
  background: var(--coral-soft);
  border-radius: 4px;
}

.funnel-foot__delta.is-up {
  color: var(--brand);
  background: var(--brand-soft);
}

.funnel-foot__hint {
  margin-left: auto;
  font-size: 8.5px;
  color: var(--faint);
}

.interview-card {
  grid-column: span 7;
  padding: 22px 24px;
}

.card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  transition: color 0.18s ease;
}

.card-link:hover {
  color: var(--brand);
}

.upcoming-list {
  display: flex;
  flex-direction: column;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 10px 4px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 8px;
  transition: background 0.18s ease;
}

.upcoming-item:first-child {
  border-top: 0;
}

.upcoming-item:hover {
  background: var(--surface-soft);
}

.upcoming-date {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 42px;
  padding: 5px 0;
  background: var(--brand-soft);
  border-radius: 9px;
}

.upcoming-date strong {
  font-size: 17px;
  font-weight: 650;
  line-height: 1;
  color: var(--brand);
}

.upcoming-date small {
  margin-top: 2px;
  font-size: 8px;
  font-weight: 650;
  color: var(--brand);
  text-transform: uppercase;
  opacity: 0.65;
}

.upcoming-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.upcoming-company {
  display: flex;
  align-items: center;
  gap: 6px;
}

.upcoming-company strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-round {
  padding: 2px 5px;
  font-size: 8px;
  font-weight: 600;
  color: var(--coral);
  white-space: nowrap;
  background: var(--coral-soft);
  border-radius: 4px;
}

.upcoming-main > small {
  overflow: hidden;
  margin-top: 2px;
  font-size: 9.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 94px;
}

.upcoming-time strong {
  font-size: 10px;
  font-weight: 650;
  color: var(--ink-soft);
}

.upcoming-time small {
  margin-top: 2px;
  font-size: 8.5px;
  color: var(--faint);
}

.upcoming-arrow {
  color: var(--faint);
}

.recent-card {
  grid-column: span 12;
  padding: 22px 24px 12px;
}

.recent-table {
  display: flex;
  flex-direction: column;
}

.recent-row {
  display: grid;
  grid-template-columns: minmax(250px, 1.6fr) 120px minmax(80px, 0.6fr) 100px 24px;
  gap: 14px;
  align-items: center;
  width: 100%;
  padding: 10px 8px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 9px;
  transition: background 0.18s ease;
}

.recent-row--head {
  padding: 4px 8px 8px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--faint);
  text-transform: uppercase;
  cursor: default;
  border-top: 0;
}

.recent-row:not(.recent-row--head):hover {
  background: var(--surface-soft);
}

.recent-company {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.recent-company > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recent-company strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 650;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-company small {
  overflow: hidden;
  margin-top: 2px;
  font-size: 9.5px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-channel {
  font-size: 10px;
  color: var(--muted);
}

.recent-updated {
  font-size: 9.5px;
  color: var(--faint);
}

.recent-arrow {
  color: var(--faint);
  text-align: right;
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

.skeleton--metric {
  height: 150px;
  border-radius: var(--radius-lg);
}

.skeleton--hero {
  grid-column: span 8;
  height: 380px;
  border-radius: var(--radius-lg);
}

.skeleton--side {
  grid-column: span 4;
  height: 380px;
  border-radius: var(--radius-lg);
}

.skeleton--mid {
  grid-column: span 6;
  height: 270px;
  border-radius: var(--radius-lg);
}

@media (max-width: 1180px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-card,
  .task-card {
    grid-column: span 12;
  }

  .task-card {
    min-height: auto;
  }

  .funnel-card,
  .interview-card {
    grid-column: span 6;
  }
}

@media (max-width: 900px) {
  .dash-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .weekly-card {
    width: 100%;
  }

  .funnel-card,
  .interview-card {
    grid-column: span 12;
  }

  .recent-row {
    grid-template-columns: minmax(200px, 1.5fr) 100px 1fr;
  }

  .recent-row > :nth-child(3),
  .recent-row > :nth-child(4) {
    display: none;
  }
}

@media (max-width: 760px) {
  .dash-head {
    padding-top: 6px;
  }

  .dash-head h1 {
    font-size: 29px;
  }

  .dash-head__desc {
    font-size: 12px;
  }

  .metrics-grid {
    gap: 10px;
  }

  .dash-grid {
    gap: 10px;
    margin-top: 10px;
  }

  .trend-card,
  .task-card,
  .funnel-card,
  .interview-card,
  .recent-card {
    padding: 18px 16px;
  }

  .upcoming-item {
    gap: 9px;
  }

  .upcoming-time {
    display: none;
  }

  .recent-card {
    padding-bottom: 10px;
  }

  .recent-row {
    grid-template-columns: minmax(0, 1fr) 90px 16px;
    gap: 8px;
  }

  .recent-row--head {
    display: none;
  }

  .recent-company :deep(.company-avatar) {
    width: 30px !important;
    height: 30px !important;
  }
}
</style>
