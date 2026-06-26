import api from '@/services/api'
import type { AuthApiUser, CurrentUserResponse, LoginResponse } from '@/types/auth'
import type { BootstrapPayload } from '@/types/users'

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

  async bootstrap(payload: BootstrapPayload, secret: string) {
    const { data } = await api.post<{ data: AuthApiUser }>('/auth/bootstrap', payload, {
      headers: { 'X-Bootstrap-Secret': secret },
    })
    return data
  },
}
