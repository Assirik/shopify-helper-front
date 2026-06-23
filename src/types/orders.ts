import type { Pagination, BulkOrderResult } from '@/types/attention'

export type { Pagination, BulkOrderResult }

/** Élément de la liste générale des commandes (`GET /orders`). */
export interface OrderListItem {
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
export interface OrderDetail {
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
  }
}

export interface OrderActionCapabilities {
  canConfirm: boolean
  canRemind: boolean
  canCancel: boolean
}

/**
 * Dérive les actions disponibles depuis le statut de confirmation client.
 * Le contrat liste ne renvoie pas de capabilities ; on les calcule comme dans
 * le détail commande (design handoff) pour masquer les actions non pertinentes.
 */
export function orderActionCapabilities(status: string): OrderActionCapabilities {
  switch (status) {
    case 'pending':
    case 'needs_attention':
    case 'sms_only':
    case 'expired':
      return { canConfirm: true, canRemind: true, canCancel: true }
    case 'confirmed':
      return { canConfirm: false, canRemind: false, canCancel: true }
    case 'cancelled':
    default:
      return { canConfirm: false, canRemind: false, canCancel: false }
  }
}
