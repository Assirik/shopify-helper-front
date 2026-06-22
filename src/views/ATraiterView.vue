<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAttentionStore, type AttentionFilter } from '@/stores/attention'
import type { AttentionOrder, AttentionReason } from '@/types/attention'

const store = useAttentionStore()
const { items, counts, pagination, activeFilter, loading, errorCode, selectedIds } = storeToRefs(store)
const snackbar = ref({ show: false, text: '' })

const headers = [
  { title: 'N°', key: 'orderName', sortable: false, width: 105 },
  { title: 'Client', key: 'customerName', sortable: false, minWidth: 190 },
  { title: 'Région', key: 'region', sortable: false, width: 140 },
  { title: 'Montant', key: 'amount', sortable: false, width: 135 },
  { title: 'Raison', key: 'reason', sortable: false, width: 165 },
  { title: 'Dernier message', key: 'lastCustomerMessage', sortable: false, minWidth: 220 },
  { title: 'Reçu', key: 'receivedAt', sortable: false, width: 145 },
  { title: 'Actions', key: 'actions', sortable: false, width: 130, align: 'end' as const },
]

const reasons: Record<AttentionReason, { label: string; color: string }> = {
  free_text: { label: 'Réponse libre', color: 'attention' },
  sms_only: { label: 'SMS seul', color: 'info' },
  invalid_number: { label: 'Numéro invalide', color: 'error' },
  late_confirm: { label: 'Confirmation tardive', color: 'warning' },
}

const amountFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const formatAmount = (order: AttentionOrder) => {
  const value = Number(order.amount.value)
  return `${Number.isFinite(value) ? amountFormatter.format(value) : order.amount.value} ${order.amount.currency}`
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : dateFormatter.format(date)
}

function showDetail(_event: MouseEvent, row: { item: AttentionOrder }) {
  snackbar.value = { show: true, text: `Détail ${row.item.orderName} — écran à venir` }
}

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

    <v-card v-else-if="items.length" border flat rounded="lg" class="overflow-hidden">
      <v-data-table-server
        v-model="selectedIds"
        class="attention-table"
        :headers="headers"
        :items="items"
        item-value="id"
        show-select
        :loading="loading"
        :items-length="pagination.total"
        :items-per-page="pagination.limit"
        :page="pagination.page"
        :items-per-page-options="[10, 20, 50]"
        hover
        @update:page="store.setPage"
        @update:items-per-page="store.setLimit"
        @click:row="showDetail"
      >
        <template #item.orderName="{ item }">
          <span class="font-weight-bold text-primary">{{ item.orderName }}</span>
        </template>

        <template #item.customerName="{ item }">
          <div class="py-1">
            <div class="font-weight-medium text-truncate">{{ item.customerName }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.customerPhone || 'Téléphone absent' }}</div>
          </div>
        </template>

        <template #item.region="{ item }">
          <div class="d-flex align-center ga-1">
            <v-icon icon="mdi-map-marker-outline" size="16" class="text-medium-emphasis" />
            <span class="text-truncate">{{ item.region }}</span>
          </div>
        </template>

        <template #item.amount="{ item }">
          <div class="d-flex align-center ga-2 flex-wrap">
            <span class="font-weight-medium">{{ formatAmount(item) }}</span>
            <v-chip v-if="item.isCashOnDelivery" size="x-small" color="primary" variant="tonal">COD</v-chip>
          </div>
        </template>

        <template #item.reason="{ item }">
          <v-chip :color="reasons[item.reason].color" size="small" variant="tonal">
            {{ reasons[item.reason].label }}
          </v-chip>
        </template>

        <template #item.lastCustomerMessage="{ item }">
          <v-tooltip v-if="item.lastCustomerMessage" :text="item.lastCustomerMessage" location="top">
            <template #activator="{ props }">
              <span v-bind="props" class="message-preview d-block text-truncate">{{ item.lastCustomerMessage }}</span>
            </template>
          </v-tooltip>
          <span v-else class="text-medium-emphasis">—</span>
        </template>

        <template #item.receivedAt="{ item }">
          <span class="text-body-2">{{ formatDate(item.receivedAt) }}</span>
        </template>

        <template #item.actions>
          <span class="text-medium-emphasis">—</span>
        </template>
      </v-data-table-server>
    </v-card>

    <v-snackbar v-model="snackbar.show" :timeout="2500">{{ snackbar.text }}</v-snackbar>
  </section>
</template>

<style scoped>
.attention-view {
  min-width: 0;
}

.attention-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

.attention-table :deep(td) {
  height: 46px;
}

.message-preview {
  max-width: 260px;
}
</style>
