import { toApiFailure } from '@/services/errors'
import type { ValidationDetails } from '@/types/users'
import axios from 'axios'

/** Messages FR des actions d'administration des utilisateurs (liste, statut, reset). */
const USER_ACTION_MESSAGES: Record<string, string> = {
  UserNotFound: 'Utilisateur introuvable.',
  UserAlreadyExists: 'Cet utilisateur existe déjà (nom ou email).',
  CannotChangeOwnRole: 'Vous ne pouvez pas modifier votre propre rôle.',
  CannotDisableOwnAccount: 'Vous ne pouvez pas désactiver votre propre compte.',
  ValidationFailed: 'Certains champs sont invalides.',
  InvalidPassword: 'Le mot de passe est invalide (8 caractères minimum).',
}

export function userActionErrorMessage(cause: unknown): string {
  const code = toApiFailure(cause).code
  return USER_ACTION_MESSAGES[code] || 'L’action n’a pas pu être effectuée.'
}

/** Messages FR du changement de mot de passe self-service (`PUT /auth/me/password`). */
const SELF_PASSWORD_MESSAGES: Record<string, string> = {
  BadPassword: 'Mot de passe actuel incorrect.',
  InvalidPassword: 'Le nouveau mot de passe est invalide (8 caractères minimum).',
}

export function selfPasswordErrorMessage(cause: unknown): string {
  const code = toApiFailure(cause).code
  return SELF_PASSWORD_MESSAGES[code] || 'Le mot de passe n’a pas pu être modifié.'
}

/** Messages FR du bootstrap premier admin (`POST /auth/bootstrap`). */
const BOOTSTRAP_MESSAGES: Record<string, string> = {
  InvalidBootstrapSecret: 'Secret de configuration invalide.',
  BootstrapAlreadyCompleted: 'Un administrateur existe déjà.',
  BootstrapDisabled: 'La configuration initiale est indisponible. Contactez l’exploitant.',
  UserAlreadyExists: 'Cet utilisateur existe déjà (nom ou email).',
  ValidationFailed: 'Certains champs sont invalides.',
}

export function bootstrapErrorMessage(cause: unknown): string {
  const code = toApiFailure(cause).code
  return BOOTSTRAP_MESSAGES[code] || 'La configuration n’a pas pu être effectuée.'
}

/**
 * Extrait `error.response.data.details` (map champ → message) d'un `400 ValidationFailed`.
 * Renvoie `null` si absent ou mal formé.
 */
export function extractValidationDetails(cause: unknown): ValidationDetails | null {
  if (!axios.isAxiosError(cause)) return null
  const details = cause.response?.data?.details
  if (!details || typeof details !== 'object') return null

  const result: ValidationDetails = {}
  for (const [field, message] of Object.entries(details as Record<string, unknown>)) {
    if (typeof message === 'string') result[field] = message
    else if (Array.isArray(message) && typeof message[0] === 'string') result[field] = message[0]
  }
  return Object.keys(result).length ? result : null
}
