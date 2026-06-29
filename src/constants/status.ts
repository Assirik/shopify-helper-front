/**
 * Métadonnées partagées des statuts du helpdesk.
 *
 * Chaque entrée expose un libellé FR, une couleur du thème Vuetify (jamais de hex
 * en dur dans les vues) et, quand c'est utile, une icône mdi. Les couleurs
 * sémantiques (`success`, `warning`, `error`, `info`, `attention`, `neutral`)
 * sont définies dans `src/theme/palettes.ts`.
 */

export interface StatusMeta {
  label: string
  color: string
  icon?: string
}

const fallbackMeta = (value: string): StatusMeta => ({
  label: value || '—',
  color: 'neutral',
})

/** Lookup typé avec repli neutre pour les valeurs inconnues du backend. */
export const lookupMeta = (
  table: Record<string, StatusMeta>,
  value: string | undefined | null,
): StatusMeta => {
  if (!value) return { label: '—', color: 'neutral' }
  return table[value] ?? fallbackMeta(value)
}

/** Statut de confirmation client (`customerConfirmationStatus`) — le plus important. */
export const customerConfirmationStatusMeta: Record<string, StatusMeta> = {
  pending: { label: 'En attente', color: 'warning', icon: 'mdi-clock-outline' },
  confirmed: { label: 'Confirmée', color: 'success', icon: 'mdi-check-circle-outline' },
  needs_attention: { label: 'À traiter', color: 'attention', icon: 'mdi-alert-circle-outline' },
  expired: { label: 'Expirée', color: 'neutral', icon: 'mdi-timer-off-outline' },
  cancelled: { label: 'Annulée', color: 'error', icon: 'mdi-close-circle-outline' },
  sms_only: { label: 'SMS seul', color: 'info', icon: 'mdi-message-text-outline' },
}

/** Statut de notification (`notificationStatus`). */
export const notificationStatusMeta: Record<string, StatusMeta> = {
  pending: { label: 'En attente', color: 'warning', icon: 'mdi-clock-outline' },
  sent: { label: 'Envoyée', color: 'success', icon: 'mdi-check' },
  failed: { label: 'Échec', color: 'error', icon: 'mdi-alert-circle-outline' },
  skipped: { label: 'Ignorée', color: 'neutral', icon: 'mdi-debug-step-over' },
  partially_sent: { label: 'Partielle', color: 'info', icon: 'mdi-dots-horizontal' },
}

/** Statut d'un message individuel. */
export const messageStatusMeta: Record<string, StatusMeta> = {
  queued: { label: 'En file', color: 'neutral', icon: 'mdi-clock-outline' },
  sending: { label: 'Envoi…', color: 'info', icon: 'mdi-autorenew' },
  sent: { label: 'Envoyé', color: 'info', icon: 'mdi-check' },
  delivered: { label: 'Livré', color: 'info', icon: 'mdi-check-all' },
  read: { label: 'Lu', color: 'success', icon: 'mdi-check-all' },
  received: { label: 'Reçu', color: 'info', icon: 'mdi-arrow-bottom-left' },
  failed: { label: 'Échec', color: 'error', icon: 'mdi-alert-circle-outline' },
}

/** Canal d'un message. */
export const channelMeta: Record<string, StatusMeta> = {
  whatsapp: { label: 'WhatsApp', color: 'success', icon: 'mdi-whatsapp' },
  sms: { label: 'SMS', color: 'info', icon: 'mdi-message-text-outline' },
}

/** Libellé d'un provider d'envoi. */
export const providerLabel: Record<string, string> = {
  meta: 'Meta',
  termii: 'Termii',
}

export const formatProvider = (value: string | undefined | null): string => {
  if (!value) return '—'
  return providerLabel[value] ?? value
}

/** Objet du message (`templatePurpose`). */
export const templatePurposeMeta: Record<string, StatusMeta> = {
  order_confirmation_request: { label: 'Demande de confirmation', color: 'info', icon: 'mdi-help-circle-outline' },
  order_confirmed: { label: 'Confirmée', color: 'success', icon: 'mdi-check-circle-outline' },
  order_cancelled: { label: 'Annulée', color: 'error', icon: 'mdi-close-circle-outline' },
  reminder: { label: 'Relance', color: 'warning', icon: 'mdi-bell-ring-outline' },
  sms_fallback: { label: 'Repli SMS', color: 'neutral', icon: 'mdi-subdirectory-arrow-right' },
}

/** Statut opérationnel de la commande (`operationalStatus`). */
export const operationalStatusMeta: Record<string, StatusMeta> = {
  to_deliver: { label: 'À Livrer', color: 'warning', icon: 'mdi-package-variant-closed' },
  in_delivery: { label: 'Livraison en cours', color: 'info', icon: 'mdi-truck-fast-outline' },
  delivered: { label: 'Livré', color: 'success', icon: 'mdi-check-circle-outline' },
  delivery_failed: { label: 'Échec', color: 'error', icon: 'mdi-alert-circle-outline' },
  returned: { label: 'Retour', color: 'neutral', icon: 'mdi-keyboard-return' },
}

/** Statut d'encaissement COD (`codPaymentStatus`). */
export const codPaymentStatusMeta: Record<string, StatusMeta> = {
  paid: { label: 'Encaissé', color: 'success', icon: 'mdi-cash-check' },
  partial: { label: 'Partiel', color: 'warning', icon: 'mdi-cash-clock' },
  unpaid: { label: 'Non encaissé', color: 'error', icon: 'mdi-cash-remove' },
}

/** Canal de livraison (`deliveryChannel`). */
export const deliveryChannelMeta: Record<string, StatusMeta> = {
  internal: { label: 'Livreur interne', color: 'primary', icon: 'mdi-moped-outline' },
  carrier: { label: 'Transporteur', color: 'info', icon: 'mdi-truck-delivery-outline' },
}

/** Type d'événement de la timeline opérationnelle (`OrderEvent.type`). */
export const orderEventTypeMeta: Record<string, StatusMeta> = {
  confirmed: { label: 'Commande confirmée', color: 'success', icon: 'mdi-check-circle-outline' },
  cancelled: { label: 'Commande annulée', color: 'error', icon: 'mdi-close-circle-outline' },
  reminded: { label: 'Relance envoyée', color: 'warning', icon: 'mdi-bell-ring-outline' },
  dispatched: { label: 'Expédiée', color: 'info', icon: 'mdi-truck-fast-outline' },
  delivered: { label: 'Livrée', color: 'success', icon: 'mdi-check-circle-outline' },
  delivery_failed: { label: 'Échec de livraison', color: 'error', icon: 'mdi-alert-circle-outline' },
  returned: { label: 'Retour', color: 'neutral', icon: 'mdi-keyboard-return' },
  payment_recorded: { label: 'Encaissement enregistré', color: 'primary', icon: 'mdi-cash-register' },
}

/** Rôle d'un utilisateur du helpdesk. */
export const roleMeta: Record<string, StatusMeta> = {
  ADMIN: { label: 'Administrateur', color: 'primary', icon: 'mdi-shield-account-outline' },
  USER: { label: 'Agent', color: 'neutral', icon: 'mdi-account-outline' },
  DEVELOPER: { label: 'Développeur', color: 'info', icon: 'mdi-code-tags' },
}

/** Statut d'un compte utilisateur (`isActive`). */
export const accountStatusMeta: Record<string, StatusMeta> = {
  active: { label: 'Actif', color: 'success', icon: 'mdi-check-circle-outline' },
  disabled: { label: 'Désactivé', color: 'error', icon: 'mdi-close-circle-outline' },
}

/** Clé de statut compte à partir du booléen `isActive`. */
export const accountStatusKey = (isActive: boolean): 'active' | 'disabled' =>
  isActive ? 'active' : 'disabled'

/** Statut d'un template Meta dans le catalogue WhatsApp. */
export const templateStatusMeta: Record<string, StatusMeta> = {
  APPROVED: { label: 'Approuvé', color: 'success', icon: 'mdi-check-decagram' },
  PENDING: { label: 'En attente', color: 'warning', icon: 'mdi-timer-sand' },
  REJECTED: { label: 'Rejeté', color: 'error', icon: 'mdi-block-helper' },
  PAUSED: { label: 'Suspendu', color: 'neutral', icon: 'mdi-pause-circle-outline' },
  DISABLED: { label: 'Suspendu', color: 'neutral', icon: 'mdi-pause-circle-outline' },
}
