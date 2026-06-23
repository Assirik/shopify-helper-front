import { ref } from 'vue'
import { defineStore } from 'pinia'
import { dashboardService } from '@/services/dashboard.service'
import { toApiFailure } from '@/services/errors'
import type { DashboardStats } from '@/types/dashboard'
import type { AttentionOrder } from '@/types/attention'
import type { OrderListItem } from '@/types/orders'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats | null>(null)
  const attentionPreview = ref<AttentionOrder[]>([])
  const confirmedPreview = ref<OrderListItem[]>([])
  const loading = ref(false)
  const errorCode = ref('')

  async function refresh() {
    loading.value = true
    errorCode.value = ''
    try {
      // Les aperçus sont optionnels : on n'échoue pas le dashboard si une liste manque.
      const [statsResult, attentionResult, confirmedResult] = await Promise.allSettled([
        dashboardService.getStats(),
        dashboardService.getAttentionPreview(),
        dashboardService.getConfirmedOrdersPreview(),
      ])

      if (statsResult.status === 'fulfilled') {
        stats.value = statsResult.value.data
      } else {
        errorCode.value = toApiFailure(statsResult.reason).code
        stats.value = null
      }

      attentionPreview.value =
        attentionResult.status === 'fulfilled' ? attentionResult.value.data : []
      confirmedPreview.value =
        confirmedResult.status === 'fulfilled' ? confirmedResult.value.data : []
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    attentionPreview,
    confirmedPreview,
    loading,
    errorCode,
    refresh,
  }
})
