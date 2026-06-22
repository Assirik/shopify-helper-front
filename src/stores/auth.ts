import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api, { TOKEN_KEY } from '@/services/api'
import { normalizeAuthUser, type AuthUser } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function setToken(value: string | null) {
    token.value = value
    if (value) {
      localStorage.setItem(TOKEN_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    if (data.user) user.value = normalizeAuthUser(data.user)
    return data
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me')
    user.value = normalizeAuthUser(data.user ?? data)
    return user.value
  }

  function logout() {
    setToken(null)
    user.value = null
  }

  return { token, user, isAuthenticated, isAdmin, login, fetchMe, logout }
})
