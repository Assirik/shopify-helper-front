import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_PALETTE, palettes } from '@/theme/palettes'

const STORAGE_KEY = 'assirik.helpdesk.palette'

function initialPalette(): string {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && palettes.some((p) => p.key === saved)) return saved
  return DEFAULT_PALETTE
}

/**
 * Gère la palette active (= nom du thème Vuetify) et la persiste.
 * L'application effective au thème Vuetify est faite dans App.vue.
 */
export const useThemeStore = defineStore('theme', () => {
  const current = ref<string>(initialPalette())

  function setPalette(key: string) {
    if (!palettes.some((p) => p.key === key)) return
    current.value = key
    localStorage.setItem(STORAGE_KEY, key)
  }

  return { current, setPalette }
})
