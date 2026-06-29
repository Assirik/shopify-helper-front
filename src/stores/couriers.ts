import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { couriersService } from '@/services/couriers.service'
import { toApiFailure } from '@/services/errors'
import type { Courier, CreateCourierPayload, UpdateCourierPayload } from '@/types/couriers'

export const useCouriersStore = defineStore('couriers', () => {
  const items = ref<Courier[]>([])
  const loading = ref(false)
  const errorCode = ref('')
  const mutatingIds = ref<string[]>([])

  /** Livreurs actifs : alimente les sélecteurs (dispatch, rapprochement). */
  const activeCouriers = computed(() => items.value.filter((c) => c.isActive))

  function setMutating(id: string, active: boolean) {
    const next = new Set(mutatingIds.value)
    if (active) next.add(id)
    else next.delete(id)
    mutatingIds.value = [...next]
  }

  async function fetchCouriers() {
    loading.value = true
    errorCode.value = ''
    try {
      items.value = await couriersService.list()
    } catch (cause) {
      errorCode.value = toApiFailure(cause).code
    } finally {
      loading.value = false
    }
  }

  /** Charge la liste une seule fois (pour les sélecteurs des dialogs). */
  async function ensureLoaded() {
    if (items.value.length || loading.value) return
    await fetchCouriers()
  }

  async function setStatus(id: string, isActive: boolean) {
    setMutating(id, true)
    try {
      await couriersService.setStatus(id, isActive)
      await fetchCouriers()
    } finally {
      setMutating(id, false)
    }
  }

  // Mutations « formulaire » : la vue gère les erreurs par champ / conflits.
  const createCourier = (payload: CreateCourierPayload) => couriersService.create(payload)
  const updateCourier = (id: string, payload: UpdateCourierPayload) =>
    couriersService.update(id, payload)

  return {
    items,
    loading,
    errorCode,
    mutatingIds,
    activeCouriers,
    fetchCouriers,
    ensureLoaded,
    setStatus,
    createCourier,
    updateCourier,
  }
})
