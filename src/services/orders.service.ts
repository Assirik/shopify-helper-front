import api from '@/services/api'
import type {
  BulkOrderResult,
  DeliverOrderPayload,
  DispatchOrderPayload,
  OrderDetailResponse,
  OrderListResponse,
} from '@/types/orders'
import type { ReconciliationParams, ReconciliationResponse } from '@/types/reconciliation'

export interface OrderListParams {
  page?: number
  limit?: number
  status?: string
  customerConfirmationStatus?: string
  operationalStatus?: string
  orderName?: string
  phone?: string
  cod?: boolean
}

export const ordersService = {
  async list(params: OrderListParams) {
    const { data } = await api.get<OrderListResponse>('/orders', { params })
    return data
  },

  async detail(orderId: string) {
    const { data } = await api.get<OrderDetailResponse>(`/orders/${orderId}`)
    return data
  },

  async confirm(orderId: string) {
    const { data } = await api.post(`/orders/${orderId}/confirm`)
    return data
  },

  async remind(orderId: string) {
    const { data } = await api.post(`/orders/${orderId}/remind`)
    return data
  },

  async cancel(orderId: string, reason: string) {
    const { data } = await api.post(`/orders/${orderId}/cancel`, { reason })
    return data
  },

  async dispatch(orderId: string, payload: DispatchOrderPayload) {
    const { data } = await api.post(`/orders/${orderId}/dispatch`, payload)
    return data
  },

  async deliver(orderId: string, payload: DeliverOrderPayload) {
    const { data } = await api.post(`/orders/${orderId}/deliver`, payload)
    return data
  },

  async markDeliveryFailed(orderId: string, reason: string) {
    const { data } = await api.post(`/orders/${orderId}/delivery-failed`, { reason })
    return data
  },

  async markReturned(orderId: string, reason: string) {
    const { data } = await api.post(`/orders/${orderId}/return`, { reason })
    return data
  },

  async reconciliation(params: ReconciliationParams) {
    const { data } = await api.get<ReconciliationResponse>('/orders/reconciliation', { params })
    return data
  },

  async bulkConfirm(orderIds: string[]) {
    const { data } = await api.post<BulkOrderResult>('/orders/bulk/confirm', { orderIds })
    return data
  },

  async bulkRemind(orderIds: string[]) {
    const { data } = await api.post<BulkOrderResult>('/orders/bulk/remind', { orderIds })
    return data
  },
}
