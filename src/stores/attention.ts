import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { AttentionCounts } from '@/types/attention'

const emptyCounts = (): AttentionCounts => ({
  all: 0,
  free_text: 0,
  sms_only: 0,
  invalid_number: 0,
  late_confirm: 0,
})

export const useAttentionStore = defineStore('attention', () => {
  const counts = reactive<AttentionCounts>(emptyCounts())

  return { counts }
})
