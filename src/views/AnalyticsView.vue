<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Calendar,
  ChatLineSquare,
  Clock,
  Collection,
  Refresh,
} from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { analyticsApi } from '@/api'
import { CHANNEL_META } from '@/constants/meta'
import type { AnalyticsData, AnalyticsRange } from '@/types'
import { formatPercent } from '@/utils/format'

const range = ref<AnalyticsRange>('30d')
const data = ref<AnalyticsData | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

const rangeOptions: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
  { value: '365d', label: '近一年' },
]

const rangeLabel = computed(() => rangeOptions.find((item) => item.value === range.value)?.label ?? '近 30 天')

const sparkApplications = computed(() => data.value?.trend.map((point) => point.applications) ?? [])

const trendStats = computed(() => {
  if (!data.value) return null
  const points = data.value.trend
  const best = points.reduce(
    (current, point) => (point.applications > current.applications ? point : current),
    points[0] ?? { label: '—', applications: 0, interviews: 0, date: '' },
  )
  const totalApplications = points.reduce((sum, point) => sum + point.applications, 0)
  const totalInterviews = points.reduce((sum, point) => sum + point.interviews, 0)
  return {
    bestLabel: best.label,
    bestValue: best.applications,
    totalApplications,
    totalInterviews,
    average: (totalApplications / Math.max(points.length, 1)).toFixed(1),
  }
})

const channelRows = computed(() => {
  if (!data.value) return []
  const max = Math.max(...data.value.channels.map((channel) => channel.applications), 1)
  return data.value.channels.map((channel) => ({
    ...channel,
    meta: CHANNEL_META[channel.channel],
    width: Math.max(5, (channel.applications / max) * 100),
  }))
})

const bestChannel = computed(() => {
  if (!data.value?.channels.length) return null
  const meaningful = data.value.channels.filter((channel) => channel.applications >= 2)
  return [...meaningful].sort(
    (a, b) => b.responseRate - a.responseRate || b.applications - a.applications,
  )[0] ?? data.value.channels[0]
})

const peakWeekday = computed(() => {
  if (!data.value?.weekdays.length) return null
  return data.value.weekdays.reduce((best, item) => (item.value > best.value ? item : best), data.value.weekdays[0])
})

const weekdayMax = computed(() => Math.max(...(data.value?.weekdays.map((item) => item.value) ?? [1]), 1))

const offerShare = computed(() => {
  if (!data.value) return 0
  const total = data.value.statusDistribution.reduce((sum, item) => sum + item.value, 0)
  const offers = data.value.statusDistribution.find((item) => item.status === 'OFFER')?.value ?? 0
  return total ? Math.round((offers / total) * 100) : 0
})

const insights = computed(() => {
  if (!data.value) return []
  const best = bestChannel.value
  const weekday = peakWeekday.value
  return [
    {
      label: '高效渠道',
      title: best ? `「${CHANNEL_META[best.channel].label}」的回复率最高` : '还没有足够的渠道数据',
      detail: best
        ? `${best.applications} 次投递中，${best.interviews} 次进入面试，回复率 ${formatPercent(best.responseRate, 1)}。`
        : '记录更多投递后，这里会告诉你哪个渠道更值得投入。',
      tone: 'green',
    },
    {
      label: '投递节奏',
      title: weekday ? `${weekday.label}是你最常投递的一天` : '还没有形成固定节奏',
      detail: weekday
        ? `这一天共投递 ${weekday.value} 次。把精力集中在状态好的时段，比每天平均用力更有效。`
        : '试着固定一个时间段集中处理投递，节奏会更容易保持。',
      tone: 'amber',
    },
    {
      label: '反馈速度',
      title: `平均 ${data.value.summary.avgResponseDays.value} 天收到反馈`,
      detail:
        data.value.summary.avgResponseDays.delta <= 0
          ? '比上一周期更快了，说明岗位匹配度和投递质量在提升。'
          : '比上一周期稍慢，可以优先跟进仍在筛选中的岗位。',
      tone: 'blue',
    },
  ]
})

async function load(): Promise<void> {
  if (!data.value) loading.value = true
  refreshing.value = true
  error.value = ''
  try {
    data.value = await analyticsApi.get(range.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '数据加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

watch(range, () => {
  void load()
})

onMounted(load)
</script>

<template>
  <div class="page analytics-page">
    <PageHeader
      eyebrow="CAREER ANALYTICS"
      title="数据分析"
      description="投递不是越多越好。看清渠道、节奏和转化，才能把时间花在更有效的地方。"
    >
      <template #actions>
        <div class="range-tabs">
          <button
            v-for="option in rangeOptions"
            :key="option.value"
            type="button"
            :class="{ 'is-active': range === option.value }"
            @click="range = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="analytics-skeleton">
      <div class="metrics-grid">
        <div v-for="index in 4" :key="index" class="skeleton skeleton--metric" />
      </div>
      <div class="analytics-grid">
        <div class="skeleton skeleton--trend" />
        <div class="skeleton skeleton--aside" />
      </div>
    </div>

    <div v-else-if="error && !data" class="card error-card">
      <div class="error-card__icon"><Refresh :size="20" /></div>
      <h3>数据暂时没有加载出来</h3>
      <p>{{ error }}</p>
      <button class="btn btn--primary btn--sm" type="button" @click="load">重新加载</button>
    </div>

    <template v-else-if="data">
      <div class="analytics-note">
        <span class="analytics-note__dot" />
        {{ rangeLabel }} · 共 {{ data.summary.applications.value }} 次投递
        <span v-if="refreshing" class="analytics-note__loading">更新中…</span>
      </div>

      <div class="metrics-grid">
        <MetricCard
          label="投递总量"
          :value="data.summary.applications.value"
          :delta="data.summary.applications.delta"
          note="较上一周期"
          :icon="Collection"
          :spark="sparkApplications"
        />
        <MetricCard
          label="回复率"
          :value="data.summary.responseRate.value"
          suffix="%"
          :decimals="1"
          :delta="data.summary.responseRate.delta"
          note="较上一周期"
          :icon="ChatLineSquare"
          tone="blue"
        />
        <MetricCard
          label="面试转化率"
          :value="data.summary.interviewRate.value"
          suffix="%"
          :decimals="1"
          :delta="data.summary.interviewRate.delta"
          note="较上一周期"
          :icon="Calendar"
          tone="coral"
        />
        <MetricCard
          label="平均反馈时长"
          :value="data.summary.avgResponseDays.value"
          suffix="天"
          :decimals="1"
          :delta="data.summary.avgResponseDays.delta"
          note="越短越快"
          :icon="Clock"
          tone="amber"
          invert-delta
        />
      </div>

      <div class="analytics-grid">
        <section class="card trend-panel">
          <div class="card-head">
            <div>
              <div class="card-head__title">投递与面试趋势</div>
              <div class="card-head__desc">{{ rangeLabel }}内，投递量与面试安排的变化</div>
            </div>
            <span class="trend-badge">{{ rangeLabel.toUpperCase() }}</span>
          </div>
          <TrendChart :data="data.trend" :height="286" />
          <div v-if="trendStats" class="trend-stats">
            <div>
              <span>单期最高</span>
              <strong class="num">{{ trendStats.bestValue }}</strong>
              <small>{{ trendStats.bestLabel }}</small>
            </div>
            <div>
              <span>面试总场次</span>
              <strong class="num">{{ trendStats.totalInterviews }}</strong>
              <small>含历史安排</small>
            </div>
            <div>
              <span>平均每期投递</span>
              <strong class="num">{{ trendStats.average }}</strong>
              <small>保持稳定节奏</small>
            </div>
          </div>
        </section>

        <aside class="card insight-panel">
          <div class="card-head">
            <div>
              <div class="card-head__title">本期洞察</div>
              <div class="card-head__desc">从数据里看到下一步</div>
            </div>
            <span class="insight-spark">✦</span>
          </div>
          <div class="insight-list">
            <article v-for="(insight, index) in insights" :key="insight.label" class="insight-item">
              <span class="insight-item__index" :class="`is-${insight.tone}`">0{{ index + 1 }}</span>
              <div>
                <span class="insight-item__label">{{ insight.label }}</span>
                <strong>{{ insight.title }}</strong>
                <p>{{ insight.detail }}</p>
              </div>
            </article>
          </div>
          <div class="insight-foot">
            <span class="insight-foot__line" />
            用数据复盘，而不是用情绪判断
          </div>
        </aside>

        <section class="card channel-panel">
          <div class="card-head">
            <div>
              <div class="card-head__title">渠道表现</div>
              <div class="card-head__desc">哪个渠道更值得你投入时间</div>
            </div>
            <span class="panel-hint">{{ data.channels.length }} 个渠道</span>
          </div>

          <div v-if="channelRows.length" class="channel-table">
            <div class="channel-row channel-row--head">
              <span>渠道</span>
              <span>投递</span>
              <span>面试</span>
              <span>Offer</span>
              <span>回复率</span>
            </div>
            <div v-for="channel in channelRows" :key="channel.channel" class="channel-row">
              <span class="channel-name">
                <i :style="{ background: channel.responseRate >= 50 ? 'var(--brand)' : 'var(--line-strong)' }" />
                {{ channel.meta.label }}
                <span class="channel-bar"><i :style="{ width: `${channel.width}%` }" /></span>
              </span>
              <strong class="num">{{ channel.applications }}</strong>
              <span class="num">{{ channel.interviews }}</span>
              <span class="num">{{ channel.offers }}</span>
              <span class="channel-rate num">{{ formatPercent(channel.responseRate, 0) }}</span>
            </div>
          </div>
          <div v-else class="panel-empty">还没有渠道数据，先记录几条投递吧。</div>

          <div class="channel-foot">
            <span class="channel-foot__dot" />
            回复率 = 进入筛选及以后阶段的记录 / 该渠道投递总数
          </div>
        </section>

        <section class="card donut-panel">
          <div class="card-head">
            <div>
              <div class="card-head__title">状态分布</div>
              <div class="card-head__desc">{{ rangeLabel }}内各阶段的记录占比</div>
            </div>
          </div>
          <DonutChart :data="data.statusDistribution" :size="158" />
          <div class="donut-foot">
            <span>Offer 占比</span>
            <strong class="num">{{ offerShare }}%</strong>
            <span class="donut-foot__hint">基于全部状态记录</span>
          </div>
        </section>

        <section class="card weekday-panel">
          <div class="card-head">
            <div>
              <div class="card-head__title">投递节奏</div>
              <div class="card-head__desc">你在哪一天更愿意行动</div>
            </div>
            <span v-if="peakWeekday" class="panel-hint">高峰：{{ peakWeekday.label }}</span>
          </div>
          <div class="weekday-chart">
            <div v-for="day in data.weekdays" :key="day.label" class="weekday-col">
              <span class="weekday-value num">{{ day.value }}</span>
              <div class="weekday-track">
                <span
                  :class="{ 'is-peak': peakWeekday?.label === day.label && day.value > 0 }"
                  :style="{ height: `${Math.max(day.value ? 6 : 2, (day.value / weekdayMax) * 100)}%` }"
                />
              </div>
              <span class="weekday-label">{{ day.label }}</span>
            </div>
          </div>
          <div class="weekday-foot">
            <span>把集中投递安排在状态最好的那天，比每天零散投递更有效。</span>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.range-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.range-tabs button {
  height: 30px;
  padding: 0 11px;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 7px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.range-tabs button.is-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.analytics-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: -4px 0 12px;
  font-size: 9px;
  color: var(--faint);
}

.analytics-note__dot {
  width: 5px;
  height: 5px;
  background: var(--brand);
  border-radius: 50%;
}

.analytics-note__loading {
  margin-left: auto;
  color: var(--brand);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.trend-panel {
  grid-column: span 8;
  padding: 22px 24px 17px;
}

.trend-badge {
  padding: 5px 8px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.1em;
  color: var(--muted);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 5px;
}

.trend-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding-top: 13px;
  margin-top: 4px;
  border-top: 1px solid var(--line);
}

.trend-stats > div {
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  border-left: 1px solid var(--line);
}

.trend-stats > div:first-child {
  padding-left: 0;
  border-left: 0;
}

.trend-stats span {
  font-size: 8px;
  color: var(--faint);
}

.trend-stats strong {
  margin-top: 4px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.trend-stats small {
  margin-top: 1px;
  font-size: 8px;
  color: var(--muted);
}

.insight-panel {
  display: flex;
  grid-column: span 4;
  flex-direction: column;
  padding: 22px 20px 15px;
}

.insight-spark {
  display: grid;
  width: 28px;
  height: 28px;
  font-size: 13px;
  color: #25330f;
  background: var(--accent);
  border-radius: 8px;
  place-items: center;
}

.insight-list {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.insight-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.insight-item:first-child {
  border-top: 0;
}

.insight-item__index {
  display: grid;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  font-size: 7.5px;
  font-weight: 700;
  border-radius: 6px;
  place-items: center;
}

.insight-item__index.is-green {
  color: var(--brand);
  background: var(--brand-soft);
}

.insight-item__index.is-amber {
  color: var(--amber);
  background: var(--amber-soft);
}

.insight-item__index.is-blue {
  color: var(--blue);
  background: var(--blue-soft);
}

.insight-item > div {
  min-width: 0;
}

.insight-item__label {
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--faint);
  text-transform: uppercase;
}

.insight-item strong {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.5;
  color: var(--ink);
}

.insight-item p {
  margin-top: 3px;
  font-size: 8.5px;
  line-height: 1.6;
  color: var(--muted);
}

.insight-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 11px;
  margin-top: auto;
  font-size: 8px;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.insight-foot__line {
  width: 14px;
  height: 1px;
  background: var(--brand);
}

.channel-panel {
  grid-column: span 7;
  padding: 22px 22px 15px;
}

.panel-hint {
  font-size: 8.5px;
  color: var(--faint);
}

.channel-table {
  display: flex;
  flex-direction: column;
}

.channel-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) 44px 44px 44px 68px;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  font-size: 8.5px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

.channel-row--head {
  padding: 3px 0 7px;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--faint);
  text-transform: uppercase;
  border-top: 0;
}

.channel-row strong {
  font-size: 10px;
  color: var(--ink);
}

.channel-name {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 9px;
  font-weight: 600;
  color: var(--ink-soft);
}

.channel-name > i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.channel-bar {
  display: block;
  flex: 1;
  height: 3px;
  margin-left: 5px;
  overflow: hidden;
  background: var(--surface-soft);
  border-radius: 99px;
}

.channel-bar i {
  display: block;
  height: 100%;
  background: color-mix(in srgb, var(--brand) 55%, var(--line));
  border-radius: inherit;
}

.channel-rate {
  font-weight: 700;
  color: var(--brand) !important;
}

.channel-foot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 9px;
  margin-top: 4px;
  font-size: 7.5px;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.channel-foot__dot {
  width: 3px;
  height: 3px;
  background: var(--faint);
  border-radius: 50%;
}

.panel-empty {
  padding: 40px 20px;
  font-size: 10px;
  color: var(--faint);
  text-align: center;
}

.donut-panel {
  grid-column: span 5;
  padding: 22px 22px 15px;
}

.donut-panel :deep(.donut) {
  padding: 2px 2px 0;
}

.donut-foot {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-top: 11px;
  margin-top: 12px;
  font-size: 8.5px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

.donut-foot strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand);
}

.donut-foot__hint {
  margin-left: auto;
  font-size: 7.5px;
  color: var(--faint);
}

.weekday-panel {
  grid-column: span 12;
  padding: 22px 24px 15px;
}

.weekday-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  align-items: end;
  padding: 2px 6px 0;
}

.weekday-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.weekday-value {
  font-size: 9px;
  font-weight: 650;
  color: var(--muted);
}

.weekday-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 88px;
  background: var(--surface-soft);
  border-radius: 6px;
}

.weekday-track span {
  width: 100%;
  min-height: 2px;
  background: color-mix(in srgb, var(--brand) 24%, var(--surface-muted));
  border-radius: 5px;
  transition: height 0.55s ease;
}

.weekday-track span.is-peak {
  background: linear-gradient(180deg, #b8d45f, var(--brand));
}

.weekday-label {
  font-size: 8px;
  color: var(--faint);
}

.weekday-foot {
  padding-top: 10px;
  margin-top: 10px;
  font-size: 8px;
  color: var(--faint);
  border-top: 1px solid var(--line);
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

.skeleton--trend {
  grid-column: span 8;
  height: 460px;
  border-radius: var(--radius-lg);
}

.skeleton--aside {
  grid-column: span 4;
  height: 460px;
  border-radius: var(--radius-lg);
}

@media (max-width: 1180px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-panel,
  .insight-panel,
  .channel-panel,
  .donut-panel {
    grid-column: span 12;
  }
}

@media (max-width: 760px) {
  .range-tabs {
    width: 100%;
  }

  .range-tabs button {
    flex: 1;
  }

  .analytics-grid,
  .metrics-grid {
    gap: 10px;
  }

  .trend-panel,
  .insight-panel,
  .channel-panel,
  .donut-panel,
  .weekday-panel {
    padding: 18px 16px;
  }

  .trend-stats > div {
    padding: 0 8px;
  }

  .channel-row {
    grid-template-columns: minmax(120px, 1.3fr) 38px 58px;
  }

  .channel-row > :nth-child(3),
  .channel-row > :nth-child(4) {
    display: none;
  }

  .channel-row--head > :nth-child(3),
  .channel-row--head > :nth-child(4) {
    display: none;
  }

  .donut-panel :deep(.donut) {
    flex-wrap: wrap;
  }

  .weekday-chart {
    gap: 5px;
  }

  .weekday-track {
    height: 70px;
  }
}
</style>
