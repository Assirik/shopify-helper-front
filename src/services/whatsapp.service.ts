import api from '@/services/api'
import type {
  MessageConfigResponse,
  MessageVariableConfig,
  WhatsappTemplatesResponse,
} from '@/types/whatsapp'

export const whatsappService = {
  async templates() {
    const { data } = await api.get<WhatsappTemplatesResponse>('/whatsapp/templates')
    return data
  },

  async getConfig() {
    const { data } = await api.get<MessageConfigResponse>('/whatsapp/message-config')
    return data
  },

  async updateConfig(payload: MessageVariableConfig) {
    const { data } = await api.put<MessageConfigResponse>('/whatsapp/message-config', payload)
    return data
  },
}
