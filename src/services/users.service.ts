import api from '@/services/api'
import type { AuthApiUser } from '@/types/auth'
import { normalizeAdminUser } from '@/types/users'
import type {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserListParams,
  UserListResponse,
} from '@/types/users'
import type { Pagination } from '@/types/attention'

interface AdminUserListApiResponse {
  data: AuthApiUser[]
  pagination: Pagination
}

interface AdminUserApiResponse {
  data: AuthApiUser
}

export const usersService = {
  async list(params: UserListParams): Promise<UserListResponse> {
    const { data } = await api.get<AdminUserListApiResponse>('/auth/users', { params })
    return {
      data: data.data.map(normalizeAdminUser),
      pagination: data.pagination,
    }
  },

  async create(payload: CreateUserPayload): Promise<AdminUser> {
    const { data } = await api.post<AdminUserApiResponse>('/auth/users', payload)
    return normalizeAdminUser(data.data)
  },

  async get(id: string): Promise<AdminUser> {
    const { data } = await api.get<AdminUserApiResponse>(`/auth/users/${id}`)
    return normalizeAdminUser(data.data)
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    const { data } = await api.patch<AdminUserApiResponse>(`/auth/users/${id}`, payload)
    return normalizeAdminUser(data.data)
  },

  async resetPassword(id: string, password: string): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>(`/auth/users/${id}/password`, { password })
    return data
  },

  async setStatus(id: string, isActive: boolean): Promise<AdminUser> {
    const { data } = await api.patch<AdminUserApiResponse>(`/auth/users/${id}/status`, { isActive })
    return normalizeAdminUser(data.data)
  },
}
