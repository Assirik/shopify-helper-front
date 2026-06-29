/**
 * Régions du Sénégal — miroir front de `back/.../reference/senegalRegions.ts`.
 *
 * Sert au barème de livraison (un montant par `code`). On ne garde que `code` et
 * `label` : la résolution des alias est une logique backend, pas dupliquée ici.
 */
export interface SenegalRegionOption {
  code: string
  label: string
}

export const SENEGAL_REGIONS: SenegalRegionOption[] = [
  { code: 'SN_DK', label: 'Dakar' },
  { code: 'SN_DB', label: 'Diourbel' },
  { code: 'SN_FK', label: 'Fatick' },
  { code: 'SN_KA', label: 'Kaffrine' },
  { code: 'SN_KL', label: 'Kaolack' },
  { code: 'SN_KE', label: 'Kédougou' },
  { code: 'SN_KD', label: 'Kolda' },
  { code: 'SN_LG', label: 'Louga' },
  { code: 'SN_MT', label: 'Matam' },
  { code: 'SN_SL', label: 'Saint-Louis' },
  { code: 'SN_SE', label: 'Sédhiou' },
  { code: 'SN_TC', label: 'Tambacounda' },
  { code: 'SN_TH', label: 'Thiès' },
  { code: 'SN_ZG', label: 'Ziguinchor' },
]

const REGION_LABEL_BY_CODE = new Map(SENEGAL_REGIONS.map((region) => [region.code, region.label]))

/** Libellé FR d'un code région, ou le code brut si inconnu. */
export const regionLabelFromCode = (code: string | undefined | null): string =>
  code ? REGION_LABEL_BY_CODE.get(code) ?? code : '—'
