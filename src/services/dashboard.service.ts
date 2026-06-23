import api from '@/services/api'
import type { DashboardStatsResponse } from '@/types/dashboard'
import type { OrderListResponse } from '@/types/orders'

export const dashboardService = {
  async getStats() {
    const { data } = await api.get<DashboardStatsResponse>('/dashboard/stats')
    return data
  },

  /** Aperçu de la file « À traiter » (commandes à décision humaine). */
  async getAttentionPreview(limit = 6) {
    const { data } = await api.get<OrderListResponse>('/orders', {
      params: { customerConfirmationStatus: 'needs_attention', page: 1, limit },
    })
    return data
  },

  /** Aperçu des commandes confirmées prêtes à livrer. */
  async getConfirmedOrdersPreview(limit = 6) {
    const { data } = await api.get<OrderListResponse>('/orders', {
      params: { customerConfirmationStatus: 'confirmed', page: 1, limit },
    })
    return data
  },
}
