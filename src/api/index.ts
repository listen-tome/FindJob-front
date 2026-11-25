import type {
  AnalyticsData,
  AnalyticsRange,
  Application,
  ApplicationInput,
  ApplicationQuery,
  ApplicationStatus,
  AuthResponse,
  CollectionResult,
  DashboardData,
  Interview,
  InterviewInput,
  InterviewQuery,
  InterviewStatus,
  LoginInput,
  PageResult,
  RegisterInput,
  Resume,
  ResumeInput,
  User,
  UserUpdateInput,
} from '@/types'
import { http } from './http'

function cleanApplicationQuery(query: ApplicationQuery) {
  return {
    keyword: query.keyword || undefined,
    status: query.status && query.status !== 'ALL' ? query.status : undefined,
    channel: query.channel && query.channel !== 'ALL' ? query.channel : undefined,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
}

function cleanInterviewQuery(query: InterviewQuery) {
  return {
    from: query.from,
    to: query.to,
    status: query.status && query.status !== 'ALL' ? query.status : undefined,
  }
}

export const authApi = {
  login(input: LoginInput): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/login', input).then((response) => response.data)
  },

  register(input: RegisterInput): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/register', input).then((response) => response.data)
  },

  me(): Promise<User> {
    return http.get<User>('/auth/me').then((response) => response.data)
  },

  updateProfile(input: UserUpdateInput): Promise<User> {
    return http.put<User>('/auth/profile', input).then((response) => response.data)
  },

  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    return http.put('/auth/password', input).then(() => undefined)
  },
}

export const applicationsApi = {
  list(query: ApplicationQuery = {}): Promise<PageResult<Application>> {
    return http
      .get<PageResult<Application>>('/applications', { params: cleanApplicationQuery(query) })
      .then((response) => response.data)
  },

  get(id: string): Promise<Application> {
    return http.get<Application>(`/applications/${id}`).then((response) => response.data)
  },

  create(input: ApplicationInput): Promise<Application> {
    return http.post<Application>('/applications', input).then((response) => response.data)
  },

  update(id: string, input: ApplicationInput): Promise<Application> {
    return http.put<Application>(`/applications/${id}`, input).then((response) => response.data)
  },

  updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    return http
      .patch<Application>(`/applications/${id}/status`, { status })
      .then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return http.delete(`/applications/${id}`).then(() => undefined)
  },
}

export const interviewsApi = {
  list(query: InterviewQuery = {}): Promise<CollectionResult<Interview>> {
    return http
      .get<CollectionResult<Interview>>('/interviews', { params: cleanInterviewQuery(query) })
      .then((response) => response.data)
  },

  create(input: InterviewInput): Promise<Interview> {
    return http.post<Interview>('/interviews', input).then((response) => response.data)
  },

  update(id: string, input: InterviewInput): Promise<Interview> {
    return http.put<Interview>(`/interviews/${id}`, input).then((response) => response.data)
  },

  updateStatus(id: string, status: InterviewStatus): Promise<Interview> {
    return http
      .patch<Interview>(`/interviews/${id}/status`, { status })
      .then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return http.delete(`/interviews/${id}`).then(() => undefined)
  },
}

export const resumesApi = {
  list(): Promise<CollectionResult<Resume>> {
    return http.get<CollectionResult<Resume>>('/resumes').then((response) => response.data)
  },

  upload(input: ResumeInput): Promise<Resume> {
    const formData = new FormData()
    formData.append('file', input.file)
    formData.append('name', input.name)
    formData.append('targetRole', input.targetRole)
    return http
      .post<Resume>('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((response) => response.data)
  },

  update(id: string, input: { name: string; targetRole: string }): Promise<Resume> {
    return http.put<Resume>(`/resumes/${id}`, input).then((response) => response.data)
  },

  setDefault(id: string): Promise<Resume> {
    return http.patch<Resume>(`/resumes/${id}/default`).then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return http.delete(`/resumes/${id}`).then(() => undefined)
  },
}

export const dashboardApi = {
  get(): Promise<DashboardData> {
    return http.get<DashboardData>('/dashboard').then((response) => response.data)
  },
}

export const analyticsApi = {
  get(range: AnalyticsRange): Promise<AnalyticsData> {
    return http.get<AnalyticsData>('/analytics', { params: { range } }).then((response) => response.data)
  },
}
