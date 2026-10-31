import type { Pagination, BulkOrderResult } from '@/types/attention'

export type { Pagination, BulkOrderResult }

/** Axe opérationnel de la commande (indépendant de la confirmation client). */
export type OrderOperationalStatus =
  | 'to_deliver'
  | 'in_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'returned'

/** Canal de livraison : livreur interne ou transporteur tiers. */
export type DeliveryChannel = 'internal' | 'carrier'

/** Statut d'encaissement COD. */
export type CodPaymentStatus = 'paid' | 'partial' | 'unpaid'

/** Statut de l'envoi de la conversion « Purchase » à Meta (Chantier 5 · API de conversions). */
export type CapiPurchaseStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/**
 * Champs opérationnels partagés par la liste et le détail. Tous optionnels :
 * une commande non encore confirmée n'a pas encore d'`operationalStatus`.
 *
 * ⚠️ L'API renvoie `assignedCourierId`/`assignedCarrierId` (id seul, sérialisé
 * par Mongoose) ; les noms se résolvent via les stores `couriers`/`carriers`.
 */
export interface OrderOperationalFields {
  operationalStatus?: OrderOperationalStatus
  deliveryChannel?: DeliveryChannel
  assignedCourierId?: string
  assignedCarrierId?: string
  carrierTrackingNumber?: string
  dispatchedAt?: string
  deliveredAt?: string
  deliveryAttempts?: number
  deliveryFailureReason?: string
  returnReason?: string
  codExpectedAmount?: number
  codCollectedAmount?: number
  courierFeeAmount?: number
  carrierFeeAmount?: number
  codNetRemitted?: number
  codPaymentStatus?: CodPaymentStatus
  collectedAt?: string
}

/** Élément de la liste générale des commandes (`GET /orders`). */
export interface OrderListItem extends OrderOperationalFields {
  id: string
  shopifyOrderName: string
  customerName?: string
  customerPhoneE164?: string
  deliveryRegion?: string
  shippingRegion?: string
  totalPrice?: string | number
  currency?: string
  isCashOnDelivery?: boolean
  customerConfirmationStatus: string
  notificationStatus: string
  createdAt: string
  /** Motif « À traiter » courant (`phone_mismatch`…) ; absent hors file « À traiter ». */
  attentionReasonCode?: string
  /** Date ISO où un message de confirmation est arrivé d'un autre numéro ; jamais effacée. */
  phoneMismatchAt?: string | null
  /** Dernière note interne (Lot 0 · F16) — absente tant que le backend ne l'expose pas. */
  lastNoteText?: string
  lastNoteAt?: string
  /** Capabilities calculées par le backend (source de vérité). */
  capabilities?: OrderActionCapabilities
}

export interface OrderLineItem {
  id?: string
  title?: string
  productTitle?: string
  variantTitle?: string
  sku?: string
  quantity?: number
  price?: string | number
}

/** Détail complet d'une commande (`GET /orders/:id`). */
export interface OrderDetail extends OrderOperationalFields {
  id: string
  shopifyOrderName: string
  shopifyOrderId?: string
  customerName?: string
  customerFirstName?: string
  customerLastName?: string
  customerPhoneE164?: string
  customerEmail?: string
  deliveryRegion?: string
  deliveryRegionCode?: string
  shippingRegion?: string
  deliveryAddress?: string
  deliveryPreferredMoment?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  lineItems?: OrderLineItem[]
  subtotalPrice?: string | number
  shippingPrice?: string | number
  totalDiscounts?: string | number
  totalPrice?: string | number
  totalOutstanding?: string | number
  currency?: string
  isCashOnDelivery?: boolean
  paymentGatewayNames?: string[]
  tags?: string[]
  sourceName?: string
  orderStatusUrl?: string
  customerConfirmationStatus: string
  notificationStatus: string
  confirmationSource?: string
  confirmedAt?: string
  confirmationCancelledAt?: string
  confirmationCancelReason?: string
  reminderCount?: number
  lastReminderAt?: string
  lastCustomerMessageText?: string
  lastCustomerMessageAt?: string
  lastCustomerMessageChannel?: string
  /** Motif « À traiter » courant (`phone_mismatch`, `free_text`…) ; absent hors file « À traiter ». */
  attentionReasonCode?: string
  attentionReason?: string
  /** Date ISO où un message de confirmation est arrivé d'un autre numéro ; jamais effacée. */
  phoneMismatchAt?: string | null
  /**
   * Conversion Meta et origine publicitaire (Chantier 5). Tous facultatifs : absents tant que
   * le backend ne les renvoie pas, ou pour une commande qui ne vient pas d'une publicité.
   */
  capiPurchaseStatus?: CapiPurchaseStatus
  capiPurchaseSentAt?: string
  capiEventId?: string
  capiPurchaseError?: string
  /** Valeur envoyée à Meta, en euros. */
  capiValueEur?: number
  fbclid?: string
  adId?: string
  campaignId?: string
  adsetId?: string
  utmSource?: string
  utmMedium?: string
  createdAt: string
}

export interface OrderMessage {
  id: string
  channel: string
  provider: string
  templatePurpose?: string
  templateName?: string
  status: string
  body?: string
  errorCode?: string
  errorMessage?: string
  createdAt: string
}

/** Type d'événement de la timeline opérationnelle (`OrderEvent`). */
export type OrderEventType =
  | 'confirmed'
  | 'cancelled'
  | 'reminded'
  | 'dispatched'
  | 'delivered'
  | 'delivery_failed'
  | 'returned'
  | 'payment_recorded'
  | 'note'
  | 'capi_purchase_sent'
  | 'capi_purchase_failed'
  | 'capi_purchase_skipped'
  | 'phone_mismatch'

/** Événement d'audit d'une transition de commande (`GET /orders/:id` → `events`). */
export interface OrderEvent {
  id: string
  type: OrderEventType
  fromStatus?: string
  toStatus?: string
  actorId?: string
  actorName?: string
  note?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

/**
 * Résumé des messages d'une commande. Forme imbriquée renvoyée par le backend
 * (`buildMessageSummary`, contrat §1.2). Les compteurs utiles se lisent via
 * `byChannel.whatsapp`, `byChannel.sms`, `byStatus.failed`, `byStatus.sent`.
 */
export interface OrderMessageSummary {
  total: number
  byStatus: Record<string, number>
  byChannel: Record<string, number>
  byProvider: Record<string, number>
}

export interface OrderListResponse {
  data: OrderListItem[]
  pagination: Pagination
}

export interface OrderDetailResponse {
  data: {
    order: OrderDetail
    messages: OrderMessage[]
    messageSummary: OrderMessageSummary
    events?: OrderEvent[]
    capabilities?: OrderActionCapabilities
  }
}

export interface OrderActionCapabilities {
  canConfirm: boolean
  canRemind: boolean
  canCancel: boolean
  canDispatch: boolean
  canDeliver: boolean
  canMarkFailed: boolean
  canReturn: boolean
  /** Appel sans réponse : remet la commande en file « À traiter » (Lot 0 · F15). */
  canMarkUnreachable: boolean
}

/** Source de confirmation déclarée par un agent (`POST /orders/:id/confirm`). */
export type AdminConfirmationSource = 'admin' | 'phone_call'

/**
 * Payload d'expédition d'une commande (`POST /orders/:id/dispatch`).
 * `internal` exige `courierId` ; `carrier` exige `carrierId` (+ `courierId`
 * optionnel = livreur qui encaisse, + `trackingNumber` optionnel).
 */
export interface DispatchOrderPayload {
  channel: DeliveryChannel
  courierId?: string
  carrierId?: string
  trackingNumber?: string
}

/** Payload de marquage « livrée » (`POST /orders/:id/deliver`). */
export interface DeliverOrderPayload {
  collectedAmount?: number
  courierFee?: number
  carrierFee?: number
  note?: string
}

const OPERATIONAL_FALLBACK: Pick<
  OrderActionCapabilities,
  'canDispatch' | 'canDeliver' | 'canMarkFailed' | 'canReturn'
> = {
  canDispatch: false,
  canDeliver: false,
  canMarkFailed: false,
  canReturn: false,
}

/**
 * Dérive localement les actions disponibles. **Repli uniquement** : le backend
 * renvoie désormais `capabilities` (détail + liste) qui font foi. On garde ce
 * helper pour les écrans tant que la réponse API n'est pas disponible.
 */
export function orderActionCapabilities(
  confirmationStatus: string,
  operationalStatus?: OrderOperationalStatus,
): OrderActionCapabilities {
  const operational = { ...OPERATIONAL_FALLBACK }
  switch (operationalStatus) {
    case 'to_deliver':
    case 'delivery_failed':
      operational.canDispatch = true
      break
    case 'in_delivery':
      operational.canDeliver = true
      operational.canMarkFailed = true
      break
    default:
      break
  }
  if (operationalStatus === 'in_delivery' || operationalStatus === 'delivery_failed') {
    operational.canReturn = true
  }

  // Annulation interdite une fois la commande livrée ou retournée (garde-fou §4).
  const operationalLocked = operationalStatus === 'delivered' || operationalStatus === 'returned'

  switch (confirmationStatus) {
    case 'pending':
    case 'needs_attention':
    case 'sms_only':
    case 'expired':
      return {
        canConfirm: true,
        canRemind: true,
        canCancel: !operationalLocked,
        canMarkUnreachable: true,
        ...operational,
      }
    case 'confirmed':
      return {
        canConfirm: false,
        canRemind: false,
        canCancel: !operationalLocked,
        canMarkUnreachable: false,
        ...operational,
      }
    case 'cancelled':
    default:
      return { canConfirm: false, canRemind: false, canCancel: false, canMarkUnreachable: false, ...operational }
  }
}
