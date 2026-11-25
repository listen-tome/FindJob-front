import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(relativeTime)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.locale('zh-cn')

export { dayjs }

export function formatDate(value: string | null | undefined, template = 'M月D日'): string {
  if (!value) return '—'
  return dayjs(value).format(template)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return dayjs(value).format('M月D日 HH:mm')
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  return dayjs(value).format('HH:mm')
}

export function toDateValue(value: string | null | undefined): string {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DD')
}

export function toDateTimeValue(value: string | null | undefined): string {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DDTHH:mm:ss')
}

export function fromNow(value: string | null | undefined): string {
  if (!value) return '—'
  return dayjs(value).fromNow()
}

export function relativeDay(value: string | null | undefined): string {
  if (!value) return '—'
  const target = dayjs(value).startOf('day')
  const today = dayjs().startOf('day')
  const diff = target.diff(today, 'day')
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  if (diff > 2 && diff < 7) return `${diff} 天后`
  return target.format('M月D日')
}

export function weekdayLabel(value: string | null | undefined): string {
  if (!value) return ''
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return labels[dayjs(value).day()]
}

export function greeting(): string {
  const hour = dayjs().hour()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function countdownLabel(value: string): string {
  const target = dayjs(value)
  const diffMinutes = target.diff(dayjs(), 'minute')
  if (diffMinutes < 0) return '已开始'
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)} 分钟后`
  const diffHours = target.diff(dayjs(), 'hour')
  if (diffHours < 24) return `${diffHours} 小时后`
  const days = target.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days} 天后`
}

export function isToday(value: string | null | undefined): boolean {
  if (!value) return false
  return dayjs(value).isSame(dayjs(), 'day')
}

export function isFuture(value: string | null | undefined): boolean {
  if (!value) return false
  return dayjs(value).isAfter(dayjs())
}

export function dateKey(value: string): string {
  return dayjs(value).format('YYYY-MM-DD')
}
