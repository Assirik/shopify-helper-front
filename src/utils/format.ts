/**
 * Helpers de formatage FR partagés par les vues du helpdesk.
 *
 * Toutes les fonctions retournent le repli `—` quand la valeur est absente ou
 * invalide. Aucune dépendance à une vue : utilisable dans les stores et services.
 */

export const EM_DASH = '—'

const amountFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Renvoie la valeur telle quelle si renseignée, sinon le tiret cadratin. */
export function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH
  const text = typeof value === 'number' ? String(value) : value.trim()
  return text ? text : EM_DASH
}

/** ObjectId Mongo brut (24 hex) : jamais affiché tel quel à l'utilisateur. */
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

/**
 * Nom de l'auteur d'une modification (`updatedBy`). Le backend renvoie la
 * référence peuplée `{ userName }` ; un ObjectId brut (ancienne réponse en
 * cache) est masqué derrière le tiret plutôt qu'affiché.
 */
export function formatUpdatedBy(
  value: { userName?: string | null } | string | null | undefined,
): string {
  if (value && typeof value === 'object') return formatNullable(value.userName)
  if (typeof value === 'string' && OBJECT_ID_PATTERN.test(value.trim())) return EM_DASH
  return formatNullable(value)
}

/** Montant + devise au format FR (ex : « 32 000 FCFA »). */
export function formatAmount(
  value: string | number | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === '') return EM_DASH
  const numeric = typeof value === 'number' ? value : Number(value)
  const formatted = Number.isFinite(numeric) ? amountFormatter.format(numeric) : String(value)
  const suffix = currency ? ` ${currency === 'XOF' ? 'FCFA' : currency}` : ''
  return `${formatted}${suffix}`
}

/** Date courte FR (ex : « 22 juin 2026 »). */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return EM_DASH
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? EM_DASH : dateFormatter.format(date)
}

/** Date + heure FR (ex : « 22 juin 2026, 09:24 »). */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return EM_DASH
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? EM_DASH : dateTimeFormatter.format(date)
}

/**
 * Téléphone E.164 sénégalais lisible (ex : « +221 77 412 88 90 »).
 * Les numéros non reconnus sont renvoyés tels quels.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return EM_DASH
  const trimmed = value.trim()
  if (!trimmed) return EM_DASH

  const senegal = trimmed.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/)
  if (senegal) {
    const [, a, b, c, d] = senegal
    return `+221 ${a} ${b} ${c} ${d}`
  }
  return trimmed
}

/** Pourcentage FR avec une décimale maximum (ex : « 78 % », « 78,5 % »). */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}
