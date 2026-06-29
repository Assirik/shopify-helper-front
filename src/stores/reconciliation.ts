import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { ordersService } from '@/services/orders.service'
import { toApiFailure } from '@/services/errors'
import type { ReconciliationParams, ReconciliationSummary } from '@/types/reconciliation'

/** Date du jour au format `YYYY-MM-DD` (fuseau local). */
const todayIso = (): string => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

interface ReconciliationFilters {
  date: string
  courierId: string | null
}

export const useReconciliationStore = defineStore('reconciliation', () => {
  const summary = ref<ReconciliationSummary | null>(null)
  const filters = reactive<ReconciliationFilters>({ date: todayIso(), courierId: null })
  const loading = ref(false)
  const errorCode = ref('')
  let requestSequence = 0

  function buildParams(): ReconciliationParams {
    const params: ReconciliationParams = { date: filters.date }
    if (filters.courierId) params.courierId = filters.courierId
    return params
  }

  async function fetchSummary() {
    if (!filters.date) return
    const sequence = ++requestSequence
    loading.value = true
    errorCode.value = ''
    try {
      const response = await ordersService.reconciliation(buildParams())
      if (sequence !== requestSequence) return
      summary.value = response.data
    } catch (cause) {
      if (sequence !== requestSequence) return
      errorCode.value = toApiFailure(cause).code
      summary.value = null
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  async function applyFilters(patch: Partial<ReconciliationFilters>) {
    Object.assign(filters, patch)
    await fetchSummary()
  }

  return {
    summary,
    filters,
    loading,
    errorCode,
    fetchSummary,
    applyFilters,
  }
})
