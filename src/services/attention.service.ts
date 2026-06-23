import api from '@/services/api'
import type {
  AttentionQueueResponse,
  AttentionReason,
  BulkOrderResult,
} from '@/types/attention'

export interface AttentionQueueParams {
  reason?: AttentionReason
  page?: number
  limit?: number
}

export const attentionService = {
  async list(params: AttentionQueueParams) {
    const { data } = await api.get<AttentionQueueResponse>('/orders/attention', { params })
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
