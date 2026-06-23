import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { customersService, type CustomerListParams } from '@/services/customers.service'
import { toApiFailure } from '@/services/errors'
import type { CustomerListItem, Pagination } from '@/types/customers'

export interface CustomerFilters {
  search: string
  phone: string
  email: string
}

const emptyFilters = (): CustomerFilters => ({ search: '', phone: '', email: '' })
const emptyPagination = (): Pagination => ({ page: 1, limit: 20, total: 0, pages: 0 })

export const useCustomersStore = defineStore('customers', () => {
  const items = ref<CustomerListItem[]>([])
  const pagination = reactive<Pagination>(emptyPagination())
  const filters = reactive<CustomerFilters>(emptyFilters())
  const loading = ref(false)
  const errorCode = ref('')

  let requestSequence = 0

  function buildParams(): CustomerListParams {
    const params: CustomerListParams = { page: pagination.page, limit: pagination.limit }
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.phone.trim()) params.phone = filters.phone.trim()
    if (filters.email.trim()) params.email = filters.email.trim()
    return params
  }

  async function fetchList() {
    const sequence = ++requestSequence
    loading.value = true
    errorCode.value = ''
    try {
      const response = await customersService.list(buildParams())
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

  async function applyFilters(patch: Partial<CustomerFilters>) {
    Object.assign(filters, patch)
    pagination.page = 1
    await fetchList()
  }

  function reset() {
    Object.assign(filters, emptyFilters())
    Object.assign(pagination, emptyPagination())
    items.value = []
    errorCode.value = ''
  }

  async function setPage(page: number) {
    pagination.page = page
    await fetchList()
  }

  async function setLimit(limit: number) {
    pagination.limit = limit
    pagination.page = 1
    await fetchList()
  }

  return {
    items,
    pagination,
    filters,
    loading,
    errorCode,
    fetchList,
    applyFilters,
    reset,
    setPage,
    setLimit,
  }
})
