import type { CodPaymentStatus, DeliveryChannel } from '@/types/orders'

/** Écart de caisse : commande livrée dont l'encaissement n'est pas complet. */
export interface ReconciliationDiscrepancy {
  orderId: string
  shopifyOrderName: string
  codExpectedAmount: number
  codCollectedAmount: number
  codPaymentStatus: CodPaymentStatus
}

/** Agrégat par livreur (ou bloc transporteurs tiers) pour une journée. */
export interface ReconciliationGroup {
  courierId: string | null
  courierName: string
  channel: DeliveryChannel
  deliveredCount: number
  totalCollected: number
  totalCourierFee: number
  totalNetRemitted: number
  discrepancies: ReconciliationDiscrepancy[]
}

/** Totaux consolidés de la journée. */
export interface ReconciliationTotals {
  deliveredCount: number
  totalCollected: number
  totalCourierFee: number
  totalNetRemitted: number
  discrepancyCount: number
}

/** Récapitulatif de rapprochement de caisse (`GET /orders/reconciliation`). */
export interface ReconciliationSummary {
  date: string
  courierId?: string | null
  totals: ReconciliationTotals
  groups: ReconciliationGroup[]
}

export interface ReconciliationResponse {
  data: ReconciliationSummary
}

export interface ReconciliationParams {
  date: string
  courierId?: string
}
