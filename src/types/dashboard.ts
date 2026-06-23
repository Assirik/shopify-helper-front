/** Statistiques opérationnelles (`GET /dashboard/stats`). */
export interface DashboardStats {
  ordersToday: number
  ordersYesterday: number
  attention: number
  confirmationRate: number
  messageFailures: number
  smsFallbacks: number
  cancelledOrders: number
  jobsSucceeded?: number
  jobsFailed?: number
}

export interface DashboardStatsResponse {
  data: DashboardStats
}
