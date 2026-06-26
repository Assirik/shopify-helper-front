<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    message?: string
    icon?: string
    retryLabel?: string
    loading?: boolean
  }>(),
  {
    title: 'Une erreur est survenue',
    message: 'Le chargement a échoué. Vérifiez votre connexion puis réessayez.',
    icon: 'mdi-alert-circle-outline',
    retryLabel: 'Réessayer',
    loading: false,
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <v-sheet border rounded="lg" class="pa-10 text-center" role="alert">
    <v-icon :icon="icon" color="error" size="42" class="mb-3" />
    <p class="text-subtitle-1 font-weight-medium mb-1">{{ title }}</p>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ message }}</p>
    <v-btn
      color="primary"
      variant="tonal"
      prepend-icon="mdi-refresh"
      :loading="loading"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </v-btn>
  </v-sheet>
</template>
