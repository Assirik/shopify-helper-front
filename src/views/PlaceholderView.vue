<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-1">{{ title }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">Écran à construire (lot suivant).</p>

    <v-card variant="tonal" rounded="lg" class="pa-8 text-center">
      <v-icon icon="mdi-hammer-wrench" size="40" class="mb-2" />
      <div class="text-body-1">Cette section sera implémentée prochainement.</div>
    </v-card>
  </div>
</template>
