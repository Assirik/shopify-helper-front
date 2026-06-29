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

const toAmount = (raw: string): number => {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0
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
      .filter(([, raw]) => raw.trim() !== '')
      .map(([regionCode, raw]) => ({ regionCode, amount: toAmount(raw) }))
    return { defaultFee: toAmount(defaultFee.value), regionFees: fees }
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

  async function save() {
    if (!dirty.value) return false
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
    fetchConfig,
    setRegionFee,
    discardChanges,
    save,
  }
})
