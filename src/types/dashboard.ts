/** Statistiques opérationnelles (`GET /dashboard/stats`). */
export interface DashboardStats {
  ordersToday: number
  ordersYesterday: number
  attention: number
  confirmationRate: number
  messageFailures: number
  smsFallbacks: number
  cancelledOrders: number
  /** Commandes confirmées en attente d'expédition (inclut les échecs re-livrables). */
  toDeliver: number
  /** Commandes actuellement en cours de livraison. */
  inDelivery: number
  /** Commandes livrées aujourd'hui. */
  deliveredToday: number
  /** Cash COD encaissé sur les livraisons du jour. */
  cashCollectedToday: number
  /** Net à reverser en caisse par les livreurs (encaissé − rémunérations − coûts transporteurs). */
  netToRemitToday: number
  /** Livraisons du jour avec encaissement incomplet (partiel/impayé). */
  cashDiscrepancies: number
  jobsSucceeded?: number
  jobsFailed?: number
}

export interface DashboardStatsResponse {
  data: DashboardStats
}
