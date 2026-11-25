export type ApplicationStatus =
  | 'WISHLIST'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'

export type ApplicationPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type ApplicationChannel =
  | 'BOSS'
  | 'REFERRAL'
  | 'OFFICIAL'
  | 'LINKEDIN'
  | 'CAMPUS'
  | 'OTHER'

export type InterviewType = 'PHONE' | 'VIDEO' | 'ONSITE'
export type InterviewStatus = 'UPCOMING' | 'COMPLETED' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  school: string
  major: string
  graduationYear: number
  targetRole: string
  location: string
  bio: string
  weeklyGoal: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface Application {
  id: string
  company: string
  position: string
  location: string
  salary: string
  channel: ApplicationChannel
  status: ApplicationStatus
  priority: ApplicationPriority
  appliedAt: string | null
  nextActionAt: string | null
  tags: string[]
  notes: string
  resumeId: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationInput {
  company: string
  position: string
  location: string
  salary: string
  channel: ApplicationChannel
  status: ApplicationStatus
  priority: ApplicationPriority
  appliedAt: string | null
  nextActionAt: string | null
  tags: string[]
  notes: string
  resumeId: string | null
}

export interface ApplicationQuery {
  keyword?: string
  status?: ApplicationStatus | 'ALL'
  channel?: ApplicationChannel | 'ALL'
  page?: number
  size?: number
  sort?: string
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface CollectionResult<T> {
  items: T[]
  total: number
}

export interface Interview {
  id: string
  applicationId: string | null
  company: string
  position: string
  round: string
  type: InterviewType
  scheduledAt: string
  durationMinutes: number
  location: string
  link: string
  interviewer: string
  status: InterviewStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface InterviewInput {
  applicationId: string | null
  company: string
  position: string
  round: string
  type: InterviewType
  scheduledAt: string
  durationMinutes: number
  location: string
  link: string
  interviewer: string
  status: InterviewStatus
  notes: string
}

export interface InterviewQuery {
  from?: string
  to?: string
  status?: InterviewStatus | 'ALL'
}

export interface Resume {
  id: string
  name: string
  targetRole: string
  version: number
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ResumeInput {
  name: string
  targetRole: string
  file: File
}

export interface UserUpdateInput {
  name: string
  school: string
  major: string
  graduationYear: number
  targetRole: string
  location: string
  bio: string
  weeklyGoal: number
}

export interface MetricValue {
  value: number
  delta: number
}

export interface TrendPoint {
  date: string
  label: string
  applications: number
  interviews: number
}

export interface FunnelItem {
  key: string
  label: string
  value: number
  rate: number
}

export interface StatusDatum {
  status: ApplicationStatus
  value: number
}

export interface DashboardTask {
  id: string
  title: string
  meta: string
  kind: 'FOLLOW_UP' | 'INTERVIEW' | 'REVIEW'
  dueAt: string | null
}

export interface DashboardData {
  metrics: {
    total: MetricValue
    active: MetricValue
    interviews: MetricValue
    offers: MetricValue
    responseRate: MetricValue
    weekly: {
      applied: number
      target: number
    }
  }
  trend: TrendPoint[]
  funnel: FunnelItem[]
  statusDistribution: StatusDatum[]
  upcomingInterviews: Interview[]
  recentApplications: Application[]
  tasks: DashboardTask[]
}

export type AnalyticsRange = '30d' | '90d' | '365d'

export interface ChannelStat {
  channel: ApplicationChannel
  applications: number
  interviews: number
  offers: number
  responseRate: number
}

export interface WeekdayStat {
  label: string
  value: number
}

export interface AnalyticsData {
  range: AnalyticsRange
  summary: {
    applications: MetricValue
    responseRate: MetricValue
    interviewRate: MetricValue
    offerRate: MetricValue
    avgResponseDays: MetricValue
  }
  trend: TrendPoint[]
  channels: ChannelStat[]
  statusDistribution: StatusDatum[]
  weekdays: WeekdayStat[]
}

export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors?: Record<string, string>
  timestamp?: string
}
