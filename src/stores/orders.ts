import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { ordersService, type OrderListParams } from '@/services/orders.service'
import { toApiFailure } from '@/services/errors'
import {
  orderActionCapabilities,
  type BulkOrderResult,
  type DeliverOrderPayload,
  type DispatchOrderPayload,
  type OrderActionCapabilities,
  type OrderDetail,
  type OrderEvent,
  type OrderListItem,
  type OrderMessage,
  type OrderMessageSummary,
  type Pagination,
} from '@/types/orders'

export interface OrderFilters {
  orderName: string
  phone: string
  customerConfirmationStatus: string | null
  operationalStatus: string | null
  status: string | null
  cod: boolean | null
  /** Masque les commandes terminées (livrées ET payées) — activé par défaut. */
  hideCompleted: boolean
}

const emptyFilters = (): OrderFilters => ({
  orderName: '',
  phone: '',
  customerConfirmationStatus: null,
  operationalStatus: null,
  status: null,
  cod: null,
  hideCompleted: true,
})

/** Capabilities d'une ligne : API si présente, sinon repli local. */
const lineCapabilities = (order: OrderListItem): OrderActionCapabilities =>
  order.capabilities ?? orderActionCapabilities(order.customerConfirmationStatus, order.operationalStatus)

const emptyPagination = (): Pagination => ({ page: 1, limit: 20, total: 0, pages: 0 })

export const useOrdersStore = defineStore('orders', () => {
  const items = ref<OrderListItem[]>([])
  const pagination = reactive<Pagination>(emptyPagination())
  const filters = reactive<OrderFilters>(emptyFilters())
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])
  const selectedIds = ref<string[]>([])

  // Détail courant
  const detail = ref<OrderDetail | null>(null)
  const detailMessages = ref<OrderMessage[]>([])
  const detailSummary = ref<OrderMessageSummary | null>(null)
  const detailEvents = ref<OrderEvent[]>([])
  const detailCapabilities = ref<OrderActionCapabilities | null>(null)
  const detailLoading = ref(false)
  const detailErrorCode = ref('')

  let listSequence = 0
  let detailSequence = 0

  const selectedOrders = computed(() => items.value.filter(o => selectedIds.value.includes(o.id)))
  const selectedConfirmableIds = computed(() =>
    selectedOrders.value
      .filter(o => lineCapabilities(o).canConfirm)
      .map(o => o.id),
  )
  const selectedRemindableIds = computed(() =>
    selectedOrders.value
      .filter(o => lineCapabilities(o).canRemind)
      .map(o => o.id),
  )

  function setMutating(orderIds: string[], active: boolean) {
    const next = new Set(mutatingIds.value)
    orderIds.forEach(id => (active ? next.add(id) : next.delete(id)))
    mutatingIds.value = [...next]
  }

  function buildParams(): OrderListParams {
    const params: OrderListParams = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filters.orderName.trim()) params.orderName = filters.orderName.trim()
    if (filters.phone.trim()) params.phone = filters.phone.trim()
    if (filters.customerConfirmationStatus) params.customerConfirmationStatus = filters.customerConfirmationStatus
    if (filters.operationalStatus) params.operationalStatus = filters.operationalStatus
    if (filters.status) params.status = filters.status
    if (filters.cod !== null) params.cod = filters.cod
    if (filters.hideCompleted) params.hideCompleted = true
    return params
  }

  async function fetchList() {
    const sequence = ++listSequence
    loading.value = true
    errorCode.value = ''
    try {
      const response = await ordersService.list(buildParams())
      if (sequence !== listSequence) return
      items.value = response.data
      Object.assign(pagination, response.pagination)
      selectedIds.value = selectedIds.value.filter(id => items.value.some(o => o.id === id))
    } catch (cause) {
      if (sequence !== listSequence) return
      errorCode.value = toApiFailure(cause).code
    } finally {
      if (sequence === listSequence) loading.value = false
    }
  }

  async function applyFilters(patch: Partial<OrderFilters>) {
    Object.assign(filters, patch)
    pagination.page = 1
    selectedIds.value = []
    await fetchList()
  }

  function resetFilters() {
    Object.assign(filters, emptyFilters())
    pagination.page = 1
    selectedIds.value = []
  }

  async function setPage(page: number) {
    pagination.page = page
    selectedIds.value = []
    await fetchList()
  }

  async function setLimit(limit: number) {
    pagination.limit = limit
    pagination.page = 1
    selectedIds.value = []
    await fetchList()
  }

  async function fetchDetail(orderId: string) {
    const sequence = ++detailSequence
    detailLoading.value = true
    detailErrorCode.value = ''
    try {
      const response = await ordersService.detail(orderId)
      if (sequence !== detailSequence) return
      detail.value = response.data.order
      detailMessages.value = response.data.messages
      detailSummary.value = response.data.messageSummary
      detailEvents.value = response.data.events ?? []
      detailCapabilities.value = response.data.capabilities ?? null
    } catch (cause) {
      if (sequence !== detailSequence) return
      detailErrorCode.value = toApiFailure(cause).code
      detail.value = null
      detailMessages.value = []
      detailSummary.value = null
      detailEvents.value = []
      detailCapabilities.value = null
    } finally {
      if (sequence === detailSequence) detailLoading.value = false
    }
  }

  async function runUnitAction(orderId: string, action: () => Promise<unknown>) {
    setMutating([orderId], true)
    try {
      await action()
      if (detail.value?.id === orderId) await fetchDetail(orderId)
      else await fetchList()
    } finally {
      setMutating([orderId], false)
    }
  }

  const confirm = (orderId: string) => runUnitAction(orderId, () => ordersService.confirm(orderId))
  const remind = (orderId: string) => runUnitAction(orderId, () => ordersService.remind(orderId))
  const cancel = (orderId: string, reason: string) =>
    runUnitAction(orderId, () => ordersService.cancel(orderId, reason))
  const dispatch = (orderId: string, payload: DispatchOrderPayload) =>
    runUnitAction(orderId, () => ordersService.dispatch(orderId, payload))
  const deliver = (orderId: string, payload: DeliverOrderPayload) =>
    runUnitAction(orderId, () => ordersService.deliver(orderId, payload))
  const markDeliveryFailed = (orderId: string, reason: string) =>
    runUnitAction(orderId, () => ordersService.markDeliveryFailed(orderId, reason))
  const markReturned = (orderId: string, reason: string) =>
    runUnitAction(orderId, () => ordersService.markReturned(orderId, reason))

  async function runBulk(orderIds: string[], action: (ids: string[]) => Promise<BulkOrderResult>) {
    if (!orderIds.length) return undefined
    setMutating(orderIds, true)
    try {
      const result = await action(orderIds)
      selectedIds.value = []
      await fetchList()
      return result
    } finally {
      setMutating(orderIds, false)
    }
  }

  const bulkConfirm = () => runBulk(selectedConfirmableIds.value, ordersService.bulkConfirm)
  const bulkRemind = () => runBulk(selectedRemindableIds.value, ordersService.bulkRemind)

  return {
    items,
    pagination,
    filters,
    loading,
    errorCode,
    mutatingIds,
    selectedIds,
    detail,
    detailMessages,
    detailSummary,
    detailEvents,
    detailCapabilities,
    detailLoading,
    detailErrorCode,
    selectedOrders,
    selectedConfirmableIds,
    selectedRemindableIds,
    fetchList,
    applyFilters,
    resetFilters,
    setPage,
    setLimit,
    fetchDetail,
    confirm,
    remind,
    cancel,
    dispatch,
    deliver,
    markDeliveryFailed,
    markReturned,
    bulkConfirm,
    bulkRemind,
  }
})
