import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { messagesService, type MessageListParams } from '@/services/messages.service'
import { toApiFailure } from '@/services/errors'
import type { MessageDetail, MessageListItem, Pagination } from '@/types/messages'

export interface MessageFilters {
  orderName: string
  status: string | null
  channel: string | null
  provider: string | null
}

const emptyFilters = (): MessageFilters => ({
  orderName: '',
  status: null,
  channel: null,
  provider: null,
})

const emptyPagination = (): Pagination => ({ page: 1, limit: 20, total: 0, pages: 0 })

export const useMessagesStore = defineStore('messages', () => {
  const items = ref<MessageListItem[]>([])
  const pagination = reactive<Pagination>(emptyPagination())
  const filters = reactive<MessageFilters>(emptyFilters())
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])

  const detail = ref<MessageDetail | null>(null)
  const detailLoading = ref(false)
  const detailErrorCode = ref('')

  let listSequence = 0
  let detailSequence = 0

  function setMutating(id: string, active: boolean) {
    const next = new Set(mutatingIds.value)
    if (active) next.add(id)
    else next.delete(id)
    mutatingIds.value = [...next]
  }

  function buildParams(): MessageListParams {
    const params: MessageListParams = { page: pagination.page, limit: pagination.limit }
    if (filters.orderName.trim()) params.orderName = filters.orderName.trim()
    if (filters.status) params.status = filters.status
    if (filters.channel) params.channel = filters.channel
    if (filters.provider) params.provider = filters.provider
    return params
  }

  async function fetchList() {
    const sequence = ++listSequence
    loading.value = true
    errorCode.value = ''
    try {
      const response = await messagesService.list(buildParams())
      if (sequence !== listSequence) return
      items.value = response.data
      Object.assign(pagination, response.pagination)
    } catch (cause) {
      if (sequence !== listSequence) return
      errorCode.value = toApiFailure(cause).code
    } finally {
      if (sequence === listSequence) loading.value = false
    }
  }

  async function applyFilters(patch: Partial<MessageFilters>) {
    Object.assign(filters, patch)
    pagination.page = 1
    await fetchList()
  }

  function resetFilters() {
    Object.assign(filters, emptyFilters())
    pagination.page = 1
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

  async function fetchDetail(messageId: string) {
    const sequence = ++detailSequence
    detailLoading.value = true
    detailErrorCode.value = ''
    try {
      const response = await messagesService.detail(messageId)
      if (sequence !== detailSequence) return
      detail.value = response.data
    } catch (cause) {
      if (sequence !== detailSequence) return
      detailErrorCode.value = toApiFailure(cause).code
      detail.value = null
    } finally {
      if (sequence === detailSequence) detailLoading.value = false
    }
  }

  async function retry(messageId: string) {
    setMutating(messageId, true)
    try {
      await messagesService.retry(messageId)
      if (detail.value?.id === messageId) await fetchDetail(messageId)
      else await fetchList()
    } finally {
      setMutating(messageId, false)
    }
  }

  return {
    items,
    pagination,
    filters,
    loading,
    errorCode,
    mutatingIds,
    detail,
    detailLoading,
    detailErrorCode,
    fetchList,
    applyFilters,
    resetFilters,
    setPage,
    setLimit,
    fetchDetail,
    retry,
  }
})
