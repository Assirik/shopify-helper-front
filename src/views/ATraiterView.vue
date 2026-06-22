<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAttentionStore, type AttentionFilter } from '@/stores/attention'

const store = useAttentionStore()
const { items, counts, activeFilter, loading, errorCode } = storeToRefs(store)

const filters: Array<{ key: AttentionFilter; label: string; color?: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'free_text', label: 'Réponse libre', color: 'attention' },
  { key: 'sms_only', label: 'SMS seul', color: 'info' },
  { key: 'invalid_number', label: 'Numéro invalide', color: 'error' },
  { key: 'late_confirm', label: 'Confirmation tardive', color: 'warning' },
]

const filterCount = (filter: AttentionFilter) => counts.value[filter]

onMounted(() => {
  void store.fetchQueue()
})
</script>

<template>
  <section class="attention-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h5 font-weight-bold">À traiter</h1>
          <v-chip color="attention" size="small" variant="flat">{{ counts.all }}</v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Commandes en attente d’une décision humaine
        </p>
      </div>
      <v-btn
        prepend-icon="mdi-refresh"
        variant="outlined"
        :loading="loading"
        @click="store.fetchQueue"
      >
        Actualiser
      </v-btn>
    </header>

    <div class="d-flex flex-wrap ga-2 mb-4" aria-label="Filtres de la file à traiter">
      <v-chip
        v-for="filter in filters"
        :key="filter.key"
        :color="activeFilter === filter.key ? filter.color || 'primary' : undefined"
        :variant="activeFilter === filter.key ? 'flat' : 'outlined'"
        filter
        @click="store.setFilter(filter.key)"
      >
        {{ filter.label }}
        <span class="ml-2 font-weight-bold">{{ filterCount(filter.key) }}</span>
      </v-chip>
    </div>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <v-alert v-if="errorCode" type="error" variant="tonal" class="mb-4">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>La file n’a pas pu être chargée.</span>
        <v-btn variant="text" size="small" @click="store.fetchQueue">Réessayer</v-btn>
      </div>
    </v-alert>

    <v-sheet v-if="!loading && !errorCode && !items.length" border rounded class="pa-10 text-center">
      <v-icon icon="mdi-check-circle-outline" color="success" size="42" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucune commande à traiter</p>
      <p class="text-body-2 text-medium-emphasis mb-0">La file est à jour pour ce filtre.</p>
    </v-sheet>

    <v-sheet v-else-if="items.length" border rounded class="pa-6 text-center text-medium-emphasis">
      Le tableau des commandes sera affiché ici.
    </v-sheet>
  </section>
</template>

<style scoped>
.attention-view {
  min-width: 0;
}
</style>
