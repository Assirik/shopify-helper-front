import { toApiFailure } from '@/services/errors'

const ORDER_ACTION_MESSAGES: Record<string, string> = {
  OrderNotFound: 'Commande introuvable.',
  OrderConfirmationNotAllowed: 'Cette commande ne peut plus être confirmée.',
  OrderReminderNotAllowed: 'Cette commande ne peut pas être relancée.',
  OrderReminderLimitReached: 'La limite de relances est atteinte.',
  OrderReminderTooSoon: 'Une relance a été envoyée trop récemment.',
  OrderReminderConflict: 'Une relance est déjà en cours, réessayez.',
  OrderPhoneRequired: 'Aucun numéro valide n’est disponible.',
  OrderCancellationNotAllowed: 'Cette commande est déjà annulée.',
  OrderCancelReasonRequired: 'Un motif d’annulation est obligatoire.',
  OrderCancelReasonTooLong: 'Le motif est trop long (500 caractères maximum).',
  OrderDispatchNotAllowed: 'Cette commande ne peut pas être expédiée dans son état actuel.',
  OrderDeliverNotAllowed: 'Cette commande ne peut pas être marquée livrée dans son état actuel.',
  OrderDeliveryFailureNotAllowed: 'Un échec de livraison ne peut pas être enregistré ici.',
  OrderReturnNotAllowed: 'Cette commande ne peut pas être passée en retour.',
  CourierRequired: 'Un livreur est requis pour une livraison interne.',
  CourierNotFound: 'Livreur introuvable.',
  CourierInactive: 'Ce livreur est désactivé.',
  InvalidDeliveryChannel: 'Canal de livraison invalide.',
  InvalidCollectedAmount: 'Le montant encaissé est invalide.',
  InvalidCourierFee: 'La rémunération livreur est invalide.',
}

/** Message FR lisible pour une erreur d'action commande (confirm/remind/cancel). */
export function orderActionErrorMessage(cause: unknown): string {
  const code = toApiFailure(cause).code
  return ORDER_ACTION_MESSAGES[code] || 'L’action n’a pas pu être effectuée.'
}

const MESSAGE_RETRY_MESSAGES: Record<string, string> = {
  MessageRetryNotAllowed: 'Ce message ne peut pas être réessayé (il n’est pas en échec).',
  MessageNotFound: 'Message introuvable.',
}

export function messageRetryErrorMessage(cause: unknown): string {
  const code = toApiFailure(cause).code
  return MESSAGE_RETRY_MESSAGES[code] || 'Le message n’a pas pu être réessayé.'
}
