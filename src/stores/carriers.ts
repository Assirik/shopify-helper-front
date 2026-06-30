import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { carriersService } from '@/services/carriers.service'
import { toApiFailure } from '@/services/errors'
import type { Carrier, CreateCarrierPayload, UpdateCarrierPayload } from '@/types/carriers'

export const useCarriersStore = defineStore('carriers', () => {
  const items = ref<Carrier[]>([])
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])

  /** Transporteurs actifs : alimente le sélecteur du dialog d'expédition. */
  const activeCarriers = computed(() => items.value.filter((c) => c.isActive))

  /** Index id → transporteur, pour résoudre noms et prix indicatifs. */
  const byId = computed(() => new Map(items.value.map((c) => [c.id, c])))

  function setMutating(id: string, active: boolean) {
    const next = new Set(mutatingIds.value)
    if (active) next.add(id)
    else next.delete(id)
    mutatingIds.value = [...next]
  }

  async function fetchCarriers() {
    loading.value = true
    errorCode.value = ''
    try {
      items.value = await carriersService.list()
    } catch (cause) {
      errorCode.value = toApiFailure(cause).code
    } finally {
      loading.value = false
    }
  }

  /** Charge la liste une seule fois (pour les sélecteurs / résolution de noms). */
  async function ensureLoaded() {
    if (items.value.length || loading.value) return
    await fetchCarriers()
  }

  async function setStatus(id: string, isActive: boolean) {
    setMutating(id, true)
    try {
      await carriersService.setStatus(id, isActive)
      await fetchCarriers()
    } finally {
      setMutating(id, false)
    }
  }

  const createCarrier = (payload: CreateCarrierPayload) => carriersService.create(payload)
  const updateCarrier = (id: string, payload: UpdateCarrierPayload) =>
    carriersService.update(id, payload)

  return {
    items,
    loading,
    errorCode,
    mutatingIds,
    activeCarriers,
    byId,
    fetchCarriers,
    ensureLoaded,
    setStatus,
    createCarrier,
    updateCarrier,
  }
})
