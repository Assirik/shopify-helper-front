import api from '@/services/api'
import type { MessageDetailResponse, MessageListResponse } from '@/types/messages'

export interface MessageListParams {
  page?: number
  limit?: number
  status?: string
  channel?: string
  provider?: string
  orderName?: string
}

export const messagesService = {
  async list(params: MessageListParams) {
    const { data } = await api.get<MessageListResponse>('/messages', { params })
    return data
  },

  async detail(messageId: string) {
    const { data } = await api.get<MessageDetailResponse>(`/messages/${messageId}`)
    return data
  },

  async retry(messageId: string) {
    const { data } = await api.post(`/messages/${messageId}/retry`)
    return data
  },
}
