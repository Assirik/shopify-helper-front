import type { BulkOrderResult } from '@/types/orders'
import { CALL_REQUIRED_CODE, CALL_REQUIRED_LABEL } from '@/utils/orderErrors'

/**
 * Résumé FR d'une action groupée (confirmation/relance) pour le snackbar.
 * `total` = sélection complète, `eligible` = sous-ensemble réellement envoyé.
 */
export function bulkSummary(
  action: string,
  total: number,
  eligible: number,
  result?: BulkOrderResult,
): string {
  if (!result) return `Aucune commande éligible pour ${action}.`
  const skipped = total - eligible
  const parts = [`${result.data.summary.succeeded} réussie(s)`]
  // "Confirm by call" refusals are named separately so the agent knows what to do (call the customer).
  const callRequired = result.data.failed.filter(failure => failure.error === CALL_REQUIRED_CODE).length
  const otherFailed = result.data.summary.failed - callRequired
  if (otherFailed > 0) parts.push(`${otherFailed} en échec`)
  if (callRequired) parts.push(`${callRequired} ${CALL_REQUIRED_LABEL}`)
  if (skipped) parts.push(`${skipped} ignorée(s)`)
  return parts.join(' · ')
}
