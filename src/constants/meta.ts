import type {
  ApplicationChannel,
  ApplicationPriority,
  ApplicationStatus,
  InterviewStatus,
  InterviewType,
} from '@/types'

interface StatusMeta {
  label: string
  short: string
  color: string
  soft: string
  description: string
}

export const STATUS_ORDER: ApplicationStatus[] = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
]

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  WISHLIST: {
    label: '想投递',
    short: '想投',
    color: '#7d8798',
    soft: '#eef0f4',
    description: '先收藏，准备好再出发',
  },
  APPLIED: {
    label: '已投递',
    short: '已投',
    color: '#4e6fd0',
    soft: '#eaf0ff',
    description: '简历已经送达，等待回应',
  },
  SCREENING: {
    label: '筛选中',
    short: '筛选',
    color: '#b87918',
    soft: '#fbf1dc',
    description: 'HR 或业务正在评估',
  },
  INTERVIEW: {
    label: '面试中',
    short: '面试',
    color: '#cc6249',
    soft: '#fbece7',
    description: '进入面试流程，准备冲刺',
  },
  OFFER: {
    label: '已获 Offer',
    short: 'Offer',
    color: '#197557',
    soft: '#e2f2ea',
    description: '恭喜，开始比较与选择',
  },
  REJECTED: {
    label: '未通过',
    short: '结束',
    color: '#929a94',
    soft: '#f0f1ee',
    description: '及时复盘，下一站更好',
  },
}

export const CHANNEL_META: Record<ApplicationChannel, { label: string; short: string }> = {
  BOSS: { label: 'BOSS 直聘', short: 'BOSS' },
  REFERRAL: { label: '内推', short: '内推' },
  OFFICIAL: { label: '企业官网', short: '官网' },
  LINKEDIN: { label: 'LinkedIn', short: 'LinkedIn' },
  CAMPUS: { label: '校园招聘', short: '校招' },
  OTHER: { label: '其他渠道', short: '其他' },
}

export const PRIORITY_META: Record<
  ApplicationPriority,
  { label: string; color: string; soft: string }
> = {
  HIGH: { label: '高优先级', color: '#cc6249', soft: '#fbece7' },
  MEDIUM: { label: '中优先级', color: '#b87918', soft: '#fbf1dc' },
  LOW: { label: '低优先级', color: '#7d8798', soft: '#eef0f4' },
}

export const INTERVIEW_TYPE_META: Record<InterviewType, { label: string; icon: string }> = {
  PHONE: { label: '电话面', icon: 'Phone' },
  VIDEO: { label: '视频面', icon: 'VideoCamera' },
  ONSITE: { label: '现场面', icon: 'OfficeBuilding' },
}

export const INTERVIEW_STATUS_META: Record<
  InterviewStatus,
  { label: string; color: string; soft: string }
> = {
  UPCOMING: { label: '待参加', color: '#cc6249', soft: '#fbece7' },
  COMPLETED: { label: '已完成', color: '#197557', soft: '#e2f2ea' },
  CANCELLED: { label: '已取消', color: '#929a94', soft: '#f0f1ee' },
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
