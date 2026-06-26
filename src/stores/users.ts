import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { usersService } from '@/services/users.service'
import { toApiFailure } from '@/services/errors'
import type { UserRole } from '@/types/auth'
import type {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserListParams,
} from '@/types/users'
import type { Pagination } from '@/types/attention'

export type RoleFilter = UserRole | 'all'
export type ActiveFilter = 'all' | 'active' | 'disabled'

interface UsersFilters {
  search: string
  role: RoleFilter
  active: ActiveFilter
}

const emptyPagination = (): Pagination => ({ page: 1, limit: 20, total: 0, pages: 0 })
const emptyFilters = (): UsersFilters => ({ search: '', role: 'all', active: 'all' })

export const useUsersStore = defineStore('users', () => {
  const items = ref<AdminUser[]>([])
  const pagination = reactive<Pagination>(emptyPagination())
  const filters = reactive<UsersFilters>(emptyFilters())
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])
  let requestSequence = 0

  function setMutating(id: string, active: boolean) {
    const next = new Set(mutatingIds.value)
    active ? next.add(id) : next.delete(id)
    mutatingIds.value = [...next]
  }

  function buildParams(): UserListParams {
    const params: UserListParams = { page: pagination.page, limit: pagination.limit }
    const search = (filters.search ?? '').trim()
    if (search) params.search = search
    if (filters.role !== 'all') params.role = filters.role
    if (filters.active !== 'all') params.active = filters.active === 'active' ? 'true' : 'false'
    return params
  }

  async function fetchUsers() {
    const sequence = ++requestSequence
    loading.value = true
    errorCode.value = ''

    try {
      const response = await usersService.list(buildParams())
      if (sequence !== requestSequence) return
      items.value = response.data
      Object.assign(pagination, response.pagination)
    } catch (cause) {
      if (sequence !== requestSequence) return
      errorCode.value = toApiFailure(cause).code
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  async function applyFilters() {
    pagination.page = 1
    await fetchUsers()
  }

  async function resetFilters() {
    Object.assign(filters, emptyFilters())
    pagination.page = 1
    await fetchUsers()
  }

  async function setPage(page: number) {
    pagination.page = page
    await fetchUsers()
  }

  async function setLimit(limit: number) {
    pagination.limit = limit
    pagination.page = 1
    await fetchUsers()
  }

  async function setStatus(id: string, isActive: boolean) {
    setMutating(id, true)
    try {
      await usersService.setStatus(id, isActive)
      await fetchUsers()
    } finally {
      setMutating(id, false)
    }
  }

  // Mutations « formulaire » : on délègue au service et on laisse la vue gérer
  // les erreurs par champ (400 details) et les conflits (409).
  const createUser = (payload: CreateUserPayload) => usersService.create(payload)
  const updateUser = (id: string, payload: UpdateUserPayload) => usersService.update(id, payload)
  const resetUserPassword = (id: string, password: string) =>
    usersService.resetPassword(id, password)

  return {
    items,
    pagination,
    filters,
    loading,
    errorCode,
    mutatingIds,
    fetchUsers,
    applyFilters,
    resetFilters,
    setPage,
    setLimit,
    setStatus,
    createUser,
    updateUser,
    resetUserPassword,
  }
})
