<script setup lang="ts">
import { watchEffect } from 'vue'
import { useTheme } from 'vuetify'
import { useThemeStore } from '@/stores/theme'

// Applique la palette active du store au thème Vuetify (et réagit aux changements).
const theme = useTheme()
const themeStore = useThemeStore()

watchEffect(() => {
  theme.global.name.value = themeStore.current
})
</script>

<template>
  <v-app>
    <router-view />
  </v-app>
</template>
