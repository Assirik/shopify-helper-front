import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { deliveryFeesService } from '@/services/deliveryFees.service'
import { toApiFailure } from '@/services/errors'
import type {
  DeliveryFeeConfig,
  RegionDeliveryFee,
  UpdateDeliveryFeeConfigPayload,
} from '@/types/deliveryFees'

/** Brouillon d'édition : montant saisi par code région (chaîne pour les inputs). */
type RegionDraft = Record<string, string>

/**
 * Parse un montant saisi : `null` si vide, non numérique ou négatif. Aucun repli
 * `0` : une saisie invalide bloque l'enregistrement plutôt que de masquer l'erreur.
 */
const parseAmount = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value)
}

export const useDeliveryFeesStore = defineStore('deliveryFees', () => {
  const config = ref<DeliveryFeeConfig | null>(null)
  const defaultFee = ref('')
  const regionFees = reactive<RegionDraft>({})
  const baselineDefault = ref('')
  const baselineRegions = reactive<RegionDraft>({})
  const loading = ref(false)
  const saving = ref(false)
  const loadErrorCode = ref('')

  const dirty = computed(() => {
    if (defaultFee.value !== baselineDefault.value) return true
    const keys = new Set([...Object.keys(regionFees), ...Object.keys(baselineRegions)])
    return [...keys].some((code) => (regionFees[code] ?? '') !== (baselineRegions[code] ?? ''))
  })

  /** Défaut global invalide (vide ou non numérique/négatif) : requis. */
  const defaultFeeInvalid = computed(() => parseAmount(defaultFee.value) === null)
  /** Codes région dont le montant saisi est non vide mais invalide. */
  const invalidRegionCodes = computed(() =>
    Object.entries(regionFees)
      .filter(([, raw]) => raw.trim() !== '' && parseAmount(raw) === null)
      .map(([code]) => code),
  )
  const hasErrors = computed(() => defaultFeeInvalid.value || invalidRegionCodes.value.length > 0)
  /** Enregistrement possible : des changements valides, aucune saisie invalide. */
  const canSave = computed(() => dirty.value && !hasErrors.value)

  function applyConfig(next: DeliveryFeeConfig) {
    config.value = next
    defaultFee.value = String(next.defaultFee ?? 0)
    baselineDefault.value = defaultFee.value
    Object.keys(regionFees).forEach((key) => delete regionFees[key])
    Object.keys(baselineRegions).forEach((key) => delete baselineRegions[key])
    next.regionFees.forEach((fee) => {
      regionFees[fee.regionCode] = String(fee.amount)
      baselineRegions[fee.regionCode] = String(fee.amount)
    })
  }

  function setRegionFee(regionCode: string, value: string) {
    if (value.trim() === '') delete regionFees[regionCode]
    else regionFees[regionCode] = value
  }

  function discardChanges() {
    if (config.value) applyConfig(config.value)
  }

  function buildPayload(): UpdateDeliveryFeeConfigPayload {
    const fees: RegionDeliveryFee[] = Object.entries(regionFees)
      .map(([regionCode, raw]) => ({ regionCode, amount: parseAmount(raw) }))
      .filter((fee): fee is RegionDeliveryFee => fee.amount !== null)
    // `canSave` garantit la validité ; le `?? 0` n'est qu'un garde-fou de typage.
    return { defaultFee: parseAmount(defaultFee.value) ?? 0, regionFees: fees }
  }

  async function fetchConfig() {
    loading.value = true
    loadErrorCode.value = ''
    try {
      applyConfig(await deliveryFeesService.get())
    } catch (cause) {
      loadErrorCode.value = toApiFailure(cause).code
    } finally {
      loading.value = false
    }
  }

  // Promesse du chargement en cours : un appelant concurrent l'attend au lieu de
  // sortir immédiatement (sinon il lirait `config` encore null).
  let loadPromise: Promise<void> | null = null

  /** Charge le barème une seule fois (pour pré-remplir le dialog de livraison). */
  async function ensureLoaded() {
    if (config.value) return
    if (!loadPromise) loadPromise = fetchConfig().finally(() => (loadPromise = null))
    return loadPromise
  }

  async function save() {
    if (!canSave.value) return false
    saving.value = true
    try {
      applyConfig(await deliveryFeesService.update(buildPayload()))
      return true
    } finally {
      saving.value = false
    }
  }

  return {
    config,
    defaultFee,
    regionFees,
    loading,
    saving,
    loadErrorCode,
    dirty,
    defaultFeeInvalid,
    invalidRegionCodes,
    canSave,
    fetchConfig,
    ensureLoaded,
    setRegionFee,
    discardChanges,
    save,
  }
})
