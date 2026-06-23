import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import { TOKEN_KEY } from '@/services/api'
import { normalizeAuthUser, type AuthUser } from '@/types/auth'

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

let initializationPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)
  const status = ref<AuthStatus>('unknown')
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(
    () => status.value === 'authenticated' && Boolean(token.value) && Boolean(user.value),
  )
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function setToken(value: string | null) {
    token.value = value
    if (value) localStorage.setItem(TOKEN_KEY, value)
    else localStorage.removeItem(TOKEN_KEY)
  }

  function clearSession() {
    setToken(null)
    user.value = null
    status.value = 'anonymous'
  }

  async function initialize() {
    if (initialized.value) return
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      loading.value = true
      try {
        if (!token.value) {
          status.value = 'anonymous'
          return
        }

        const data = await authService.getCurrentUser()
        user.value = normalizeAuthUser(data.user)
        status.value = 'authenticated'
      } catch {
        clearSession()
      } finally {
        loading.value = false
        initialized.value = true
        initializationPromise = null
      }
    })()

    return initializationPromise
  }

  async function login(identifier: string, password: string) {
    loading.value = true
    try {
      const data = await authService.login(identifier, password)
      setToken(data.token)
      user.value = normalizeAuthUser(data.user)
      status.value = 'authenticated'
      initialized.value = true
      return data
    } catch (error) {
      clearSession()
      initialized.value = true
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    const data = await authService.getCurrentUser()
    user.value = normalizeAuthUser(data.user)
    status.value = 'authenticated'
    initialized.value = true
    return user.value
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true
    try {
      return await authService.changePassword(currentPassword, newPassword)
    } finally {
      loading.value = false
    }
  }

  function logout() {
    clearSession()
    initialized.value = true
  }

  return {
    token,
    user,
    status,
    initialized,
    loading,
    isAuthenticated,
    isAdmin,
    initialize,
    login,
    fetchMe,
    changePassword,
    clearSession,
    logout,
  }
})
