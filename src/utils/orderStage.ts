import type { OrderListItem } from '@/types/orders'
import { customerConfirmationStatusMeta, lookupMeta } from '@/constants/status'

/** Étapes du parcours d'une commande COD, dans l'ordre. */
export const ORDER_STAGE_STEPS = ['Confirmée', 'Expédiée', 'Livrée', 'Encaissée'] as const

export interface OrderStage {
  /** Libellé de l'état courant, du point de vue de l'agent. */
  label: string
  /** Couleur sémantique du thème (cf. `constants/status.ts`). */
  color: string
  icon: string
  /** Nombre d'étapes franchies (0 à 4). */
  completed: number
  /** Parcours interrompu (annulée, expirée, retour) : plus d'étape à venir. */
  closed: boolean
}

type StageInput = Pick<
  OrderListItem,
  'customerConfirmationStatus' | 'operationalStatus' | 'codPaymentStatus' | 'isCashOnDelivery'
>

/**
 * Situe une commande dans son parcours COD (confirmation → expédition → livraison →
 * encaissement) à partir des statuts renvoyés par l'API.
 */
export function orderStage(order: StageInput): OrderStage {
  const confirmation = order.customerConfirmationStatus

  if (confirmation === 'cancelled') {
    return { label: 'Annulée', color: 'error', icon: 'mdi-close-circle-outline', completed: 0, closed: true }
  }
  if (confirmation === 'expired') {
    return { label: 'Expirée', color: 'neutral', icon: 'mdi-timer-off-outline', completed: 0, closed: true }
  }
  if (confirmation !== 'confirmed') {
    const meta = lookupMeta(customerConfirmationStatusMeta, confirmation)
    const label = confirmation === 'pending' ? 'À confirmer' : meta.label
    return { label, color: meta.color, icon: meta.icon ?? 'mdi-clock-outline', completed: 0, closed: false }
  }

  switch (order.operationalStatus) {
    case 'in_delivery':
      return { label: 'En livraison', color: 'primary', icon: 'mdi-truck-fast-outline', completed: 2, closed: false }
    case 'delivery_failed':
      return { label: 'Échec de livraison', color: 'error', icon: 'mdi-alert-circle-outline', completed: 2, closed: false }
    case 'returned':
      return { label: 'Retournée', color: 'neutral', icon: 'mdi-keyboard-return', completed: 2, closed: true }
    case 'delivered':
      if (!order.isCashOnDelivery || order.codPaymentStatus === 'paid') {
        return { label: 'Terminée', color: 'success', icon: 'mdi-check-circle-outline', completed: 4, closed: false }
      }
      return order.codPaymentStatus === 'partial'
        ? { label: 'Encaissement partiel', color: 'warning', icon: 'mdi-cash-clock', completed: 3, closed: false }
        : { label: 'À encaisser', color: 'warning', icon: 'mdi-cash-clock', completed: 3, closed: false }
    default:
      return { label: 'À expédier', color: 'info', icon: 'mdi-package-variant-closed', completed: 1, closed: false }
  }
}
