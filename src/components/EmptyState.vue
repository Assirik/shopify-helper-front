<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    message?: string
    icon?: string
    iconColor?: string
    /** Si défini, affiche un bouton d'action secondaire (ex : réinitialiser les filtres). */
    actionLabel?: string
  }>(),
  {
    title: 'Aucun résultat',
    message: '',
    icon: 'mdi-inbox-outline',
    iconColor: 'medium-emphasis',
    actionLabel: '',
  },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <v-sheet border rounded="lg" class="pa-10 text-center">
    <v-icon :icon="icon" :color="iconColor" size="42" class="mb-3" />
    <p class="text-subtitle-1 font-weight-medium mb-1">{{ title }}</p>
    <p v-if="message" class="text-body-2 text-medium-emphasis mb-0">{{ message }}</p>
    <v-btn
      v-if="actionLabel"
      variant="text"
      color="primary"
      class="mt-3"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </v-btn>
  </v-sheet>
</template>
