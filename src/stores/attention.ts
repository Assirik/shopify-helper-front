import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { attentionService } from '@/services/attention.service'
import { toApiFailure } from '@/services/errors'
import type {
  AttentionCounts,
  AttentionOrder,
  AttentionReason,
  BulkOrderResult,
  Pagination,
} from '@/types/attention'

export type AttentionFilter = 'all' | AttentionReason

const emptyCounts = (): AttentionCounts => ({
  all: 0,
  free_text: 0,
  sms_only: 0,
  invalid_number: 0,
  late_confirm: 0,
})

const emptyPagination = (): Pagination => ({ page: 1, limit: 20, total: 0, pages: 0 })

export const useAttentionStore = defineStore('attention', () => {
  const items = ref<AttentionOrder[]>([])
  const counts = reactive<AttentionCounts>(emptyCounts())
  const pagination = reactive<Pagination>(emptyPagination())
  const activeFilter = ref<AttentionFilter>('all')
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])
  const selectedIds = ref<string[]>([])
  let requestSequence = 0

  const selectedOrders = computed(() => items.value.filter(order => selectedIds.value.includes(order.id)))
  const selectedConfirmableIds = computed(() => selectedOrders.value.filter(order => order.capabilities.canConfirm).map(order => order.id))
  const selectedRemindableIds = computed(() => selectedOrders.value.filter(order => order.capabilities.canRemind).map(order => order.id))

  function setMutating(orderIds: string[], active: boolean) {
    const next = new Set(mutatingIds.value)
    orderIds.forEach(id => (active ? next.add(id) : next.delete(id)))
    mutatingIds.value = [...next]
  }

  async function fetchQueue() {
    const sequence = ++requestSequence
    loading.value = true
    errorCode.value = ''

    try {
      const response = await attentionService.list({
        reason: activeFilter.value === 'all' ? undefined : activeFilter.value,
        page: pagination.page,
        limit: pagination.limit,
      })

      if (sequence !== requestSequence) return
      items.value = response.data
      Object.assign(counts, response.counts)
      Object.assign(pagination, response.pagination)
      selectedIds.value = selectedIds.value.filter(id => items.value.some(order => order.id === id))
    } catch (cause) {
      if (sequence !== requestSequence) return
      errorCode.value = toApiFailure(cause).code
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  // Rafraîchit uniquement les compteurs (badge sidebar) sans tirer une page
  // complète ni écraser items/pagination/selectedIds de la file partagée.
  async function fetchCounts() {
    try {
      const response = await attentionService.list({ reason: undefined, page: 1, limit: 1 })
      Object.assign(counts, response.counts)
    } catch {
      // Badge silencieux : on ne perturbe pas l'écran principal en cas d'échec.
    }
  }

  async function setFilter(filter: AttentionFilter) {
    activeFilter.value = filter
    pagination.page = 1
    selectedIds.value = []
    await fetchQueue()
  }

  async function setPage(page: number) {
    pagination.page = page
    selectedIds.value = []
    await fetchQueue()
  }

  async function setLimit(limit: number) {
    pagination.limit = limit
    pagination.page = 1
    selectedIds.value = []
    await fetchQueue()
  }

  async function runUnitAction(orderId: string, action: () => Promise<unknown>) {
    setMutating([orderId], true)
    try {
      await action()
      await fetchQueue()
    } finally {
      setMutating([orderId], false)
    }
  }

  const confirm = (orderId: string) => runUnitAction(orderId, () => attentionService.confirm(orderId))
  const remind = (orderId: string) => runUnitAction(orderId, () => attentionService.remind(orderId))
  const cancel = (orderId: string, reason: string) => runUnitAction(orderId, () => attentionService.cancel(orderId, reason))

  async function runBulk(orderIds: string[], action: (ids: string[]) => Promise<BulkOrderResult>) {
    if (!orderIds.length) return undefined
    setMutating(orderIds, true)
    try {
      const result = await action(orderIds)
      selectedIds.value = []
      await fetchQueue()
      return result
    } finally {
      setMutating(orderIds, false)
    }
  }

  const bulkConfirm = () => runBulk(selectedConfirmableIds.value, attentionService.bulkConfirm)
  const bulkRemind = () => runBulk(selectedRemindableIds.value, attentionService.bulkRemind)

  return {
    items,
    counts,
    pagination,
    activeFilter,
    loading,
    errorCode,
    mutatingIds,
    selectedIds,
    selectedOrders,
    selectedConfirmableIds,
    selectedRemindableIds,
    fetchQueue,
    fetchCounts,
    setFilter,
    setPage,
    setLimit,
    confirm,
    remind,
    cancel,
    bulkConfirm,
    bulkRemind,
  }
})
