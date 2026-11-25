import axios, { AxiosError } from 'axios'
import { TOKEN_KEY, USER_KEY } from '@/constants/auth'

interface WrappedBody {
  code: number
  msg?: string
  data?: unknown
}

function isWrappedBody(body: unknown): body is WrappedBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    'data' in body &&
    ('msg' in body || 'message' in body)
  )
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    // 兼容后端统一响应：{ code: 1, msg: "success", data: ... }
    // 解包后，所有 api 方法仍然只需要读取 response.data。
    if (isWrappedBody(response.data)) {
      const body = response.data
      if (body.code !== 1 && body.code !== 200 && body.code !== 201) {
        return Promise.reject(new Error(body.msg || '请求失败'))
      }
      response.data = body.data
    }
    return response
  },
  (error: AxiosError<{ code?: number | string; msg?: string; message?: string }>) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login')
      }
    }
    const fallback =
      status === 403
        ? '没有权限执行此操作'
        : status === 404
          ? '请求的资源不存在'
          : status && status >= 500
            ? '服务暂时不可用，请稍后重试'
            : '网络连接异常，请检查后端服务是否启动'
    const message =
      error.response?.data?.msg ||
      error.response?.data?.message ||
      fallback
    return Promise.reject(new Error(message))
  },
)

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return '操作失败，请稍后重试'
}
