import api from '@/services/api'
import type {
  BulkOrderResult,
  OrderDetailResponse,
  OrderListResponse,
} from '@/types/orders'

export interface OrderListParams {
  page?: number
  limit?: number
  status?: string
  customerConfirmationStatus?: string
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

  async bulkConfirm(orderIds: string[]) {
    const { data } = await api.post<BulkOrderResult>('/orders/bulk/confirm', { orderIds })
    return data
  },

  async bulkRemind(orderIds: string[]) {
    const { data } = await api.post<BulkOrderResult>('/orders/bulk/remind', { orderIds })
    return data
  },
}
