import type { BulkOrderResult } from '@/types/orders'

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
  if (result.data.summary.failed) parts.push(`${result.data.summary.failed} en échec`)
  if (skipped) parts.push(`${skipped} ignorée(s)`)
  return parts.join(' · ')
}
