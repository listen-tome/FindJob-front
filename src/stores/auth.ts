import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LoginInput, RegisterInput, User, UserUpdateInput } from '@/types'
import { authApi } from '@/api'
import { TOKEN_KEY, USER_KEY } from '@/constants/auth'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<User | null>(readStoredUser())
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const displayName = computed(() => user.value?.name || '同学')

  function persist(): void {
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    else localStorage.removeItem(TOKEN_KEY)
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    else localStorage.removeItem(USER_KEY)
  }

  async function login(input: LoginInput): Promise<void> {
    loading.value = true
    try {
      const response = await authApi.login(input)
      token.value = response.token
      user.value = response.user
      persist()
    } finally {
      loading.value = false
    }
  }

  async function register(input: RegisterInput): Promise<void> {
    loading.value = true
    try {
      const response = await authApi.register(input)
      token.value = response.token
      user.value = response.user
      persist()
    } finally {
      loading.value = false
    }
  }

  async function refreshProfile(): Promise<void> {
    if (!token.value) return
    const profile = await authApi.me()
    user.value = profile
    persist()
  }

  async function updateProfile(input: UserUpdateInput): Promise<void> {
    const profile = await authApi.updateProfile(input)
    user.value = profile
    persist()
  }

  async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await authApi.changePassword(input)
  }

  function logout(): void {
    token.value = ''
    user.value = null
    persist()
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    displayName,
    login,
    register,
    refreshProfile,
    updateProfile,
    changePassword,
    logout,
  }
})
