import api from '@/services/api'
import type { DashboardStatsResponse } from '@/types/dashboard'
import type { AttentionQueueResponse } from '@/types/attention'
import type { OrderListResponse } from '@/types/orders'

export const dashboardService = {
  async getStats() {
    const { data } = await api.get<DashboardStatsResponse>('/dashboard/stats')
    return data
  },

  /**
   * Aperçu de la file « À traiter » : utilise l'endpoint existant de la file
   * d'attention (`GET /api/orders/attention`, contrat §1.7) pour rester cohérent
   * avec le KPI `attention` et l'écran « À traiter ».
   */
  async getAttentionPreview(limit = 8) {
    const { data } = await api.get<AttentionQueueResponse>('/orders/attention', {
      params: { limit },
    })
    return data
  },

  /** Aperçu des commandes confirmées prêtes à livrer. */
  async getConfirmedOrdersPreview(limit = 8) {
    const { data } = await api.get<OrderListResponse>('/orders', {
      params: { customerConfirmationStatus: 'confirmed', page: 1, limit },
    })
    return data
  },
}
