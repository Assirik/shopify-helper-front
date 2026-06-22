<script setup lang="ts">
// Placeholder de structure : la grille de KPIs sera branchée sur l'API au lot suivant.
const kpis = [
  { label: 'Commandes du jour', value: '—', icon: 'mdi-cart-outline', color: 'primary' },
  { label: 'À traiter', value: '—', icon: 'mdi-alert-circle-outline', color: 'error' },
  { label: 'Taux de confirmation', value: '—', icon: 'mdi-check-decagram-outline', color: 'success' },
  { label: 'Échecs / fallback SMS', value: '—', icon: 'mdi-message-alert-outline', color: 'warning' },
]
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-1">Dashboard</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">Vue d'ensemble du helpdesk.</p>

    <v-row>
      <v-col v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" md="3">
        <v-card rounded="lg" border flat>
          <v-card-text class="d-flex align-center">
            <v-avatar :color="kpi.color" variant="tonal" size="48" class="mr-4">
              <v-icon :icon="kpi.icon" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
