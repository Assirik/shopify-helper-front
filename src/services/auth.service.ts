import api from '@/services/api'
import type { CurrentUserResponse, LoginResponse } from '@/types/auth'

export const authService = {
  async login(identifier: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { identifier, password })
    return data
  },

  async getCurrentUser() {
    const { data } = await api.get<CurrentUserResponse>('/auth/me')
    return data
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.put<{ message: string }>('/auth/me/password', {
      currentPassword,
      newPassword,
    })
    return data
  },
}
