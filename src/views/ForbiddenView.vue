<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="d-flex justify-center align-center" style="min-height: 60vh">
    <v-sheet border rounded="xl" class="pa-10 text-center" max-width="480">
      <v-avatar color="error" variant="tonal" rounded="lg" size="56" class="mb-4">
        <v-icon icon="mdi-lock-outline" size="32" />
      </v-avatar>
      <h1 class="text-h5 font-weight-bold mb-2">Accès refusé</h1>
      <p class="text-body-2 text-medium-emphasis mb-6">
        Cette section est réservée aux administrateurs.
      </p>
      <v-btn color="primary" prepend-icon="mdi-view-dashboard-outline" @click="router.push({ name: 'dashboard' })">
        Retour au tableau de bord
      </v-btn>
    </v-sheet>
  </section>
</template>
