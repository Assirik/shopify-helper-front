import type { UpdatedByUser } from '@/types/users'

/** Montant de rémunération livreur pour une région (`regionCode` = `SN_*`). */
export interface RegionDeliveryFee {
  regionCode: string
  amount: number
}

/** Barème de rémunération livreur, document global unique (`GET /delivery-fees`). */
export interface DeliveryFeeConfig {
  defaultFee: number
  regionFees: RegionDeliveryFee[]
  /** Peuplé par le backend ; `string` = ObjectId brut d'anciennes réponses. */
  updatedBy?: UpdatedByUser | string | null
  updatedAt?: string | null
}

export interface DeliveryFeeConfigResponse {
  data: DeliveryFeeConfig
}

/** Payload de mise à jour du barème (`PUT /delivery-fees`). */
export interface UpdateDeliveryFeeConfigPayload {
  defaultFee: number
  regionFees: RegionDeliveryFee[]
}

/**
 * Résout localement la rémunération attendue pour une région : montant régional
 * s'il existe, sinon le défaut global. **Repli** pour pré-remplir le dialog de
 * livraison ; le backend recalcule si le front omet la valeur.
 */
export function resolveDeliveryFee(
  config: DeliveryFeeConfig | null,
  regionCode: string | undefined | null,
): number {
  if (!config) return 0
  if (regionCode) {
    const match = config.regionFees.find((fee) => fee.regionCode === regionCode)
    if (match) return match.amount
  }
  return config.defaultFee
}
