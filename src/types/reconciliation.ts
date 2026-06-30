import type { CodPaymentStatus } from '@/types/orders'

/**
 * Écart de caisse : commande livrée dont l'encaissement n'est pas complet.
 * Forme exacte renvoyée par l'API (`reconciliation.service`).
 */
export interface ReconciliationDiscrepancy {
  orderId: string
  orderName: string
  codPaymentStatus: CodPaymentStatus
  expectedAmount: number
  collectedAmount: number
  netRemitted: number
}

/** Ledger CAISSE : agrégat par livreur interne détenant le cash. */
export interface CourierLedger {
  courierId: string | null
  courierName: string
  deliveredOrders: number
  totalCollected: number
  totalCourierFees: number
  totalCarrierFees: number
  totalNetRemitted: number
  discrepancies: ReconciliationDiscrepancy[]
}

/** Ledger DETTES : montant dû à chaque transporteur tiers. */
export interface CarrierLedger {
  carrierId: string | null
  carrierName: string
  deliveredOrders: number
  totalDue: number
}

/** Totaux consolidés (calculés sur le ledger caisse). */
export interface ReconciliationTotals {
  deliveredOrders: number
  totalCollected: number
  totalCourierFees: number
  totalCarrierFees: number
  totalNetRemitted: number
  discrepancyCount: number
}

/**
 * Récapitulatif de rapprochement (`GET /orders/reconciliation`).
 * Forme à 2 ledgers : `couriers` (caisse) et `carriers` (dettes).
 */
export interface ReconciliationSummary {
  date: string
  totals: ReconciliationTotals
  couriers: CourierLedger[]
  carriers: CarrierLedger[]
}

export interface ReconciliationResponse {
  data: ReconciliationSummary
}

export interface ReconciliationParams {
  date: string
  courierId?: string
}
