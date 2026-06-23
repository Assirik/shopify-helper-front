<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import type { CustomerListItem } from '@/types/customers'
import { formatDate, formatNullable, formatPhone } from '@/utils/format'

const store = useCustomersStore()
const router = useRouter()
const { items, pagination, loading, errorCode } = storeToRefs(store)

const searchInput = ref('')
const phoneInput = ref('')
const emailInput = ref('')

const hasActiveFilters = computed(
  () => Boolean(searchInput.value) || Boolean(phoneInput.value) || Boolean(emailInput.value),
)

const headers = [
  { title: 'Client', key: 'fullName', sortable: false, minWidth: 220 },
  { title: 'Téléphone', key: 'phoneE164', sortable: false, width: 170 },
  { title: 'Région', key: 'region', sortable: false, width: 150 },
  { title: 'Commandes', key: 'orderCount', sortable: false, width: 120, align: 'center' as const },
  { title: 'Dernière commande', key: 'lastOrder', sortable: false, minWidth: 200 },
]

function initials(customer: CustomerListItem) {
  const name = customer.fullName ?? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function applyFilters() {
  void store.applyFilters({
    search: searchInput.value,
    phone: phoneInput.value,
    email: emailInput.value,
  })
}

function resetFilters() {
  searchInput.value = ''
  phoneInput.value = ''
  emailInput.value = ''
  store.reset()
  void store.fetchList()
}

function openOrders(customer: CustomerListItem) {
  if (!customer.phoneE164) return
  void router.push({ name: 'commandes', query: { phone: customer.phoneE164 } })
}

onMounted(() => {
  void store.fetchList()
})
</script>

<template>
  <section class="clients-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Clients</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Annuaire des clients et accès rapide à leurs commandes.
        </p>
      </div>
      <v-btn
        prepend-icon="mdi-refresh"
        variant="outlined"
        border="sm opacity-25"
        rounded="lg"
        :loading="loading"
        size="large"
        @click="store.fetchList"
      >
        <span class="text-uppercase">Actualiser</span>
      </v-btn>
    </header>

    <v-card border flat rounded="lg" class="pa-4 mb-4">
      <div class="filters-grid">
        <v-text-field
          v-model="searchInput"
          label="Nom"
          prepend-inner-icon="mdi-account-search-outline"
          hide-details
          clearable
          @keyup.enter="applyFilters"
          @click:clear="applyFilters"
        />
        <v-text-field
          v-model="phoneInput"
          label="Téléphone"
          prepend-inner-icon="mdi-phone-outline"
          hide-details
          clearable
          @keyup.enter="applyFilters"
          @click:clear="applyFilters"
        />
        <v-text-field
          v-model="emailInput"
          label="Email"
          prepend-inner-icon="mdi-email-outline"
          hide-details
          clearable
          @keyup.enter="applyFilters"
          @click:clear="applyFilters"
        />
        <div class="d-flex align-center ga-2">
          <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="applyFilters">Filtrer</v-btn>
          <v-btn
            variant="text"
            prepend-icon="mdi-filter-remove-outline"
            :disabled="!hasActiveFilters"
            @click="resetFilters"
          >
            Réinitialiser
          </v-btn>
        </div>
      </div>
    </v-card>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <v-alert v-if="errorCode" type="error" variant="tonal" class="mb-4" role="alert">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>Les clients n’ont pas pu être chargés.</span>
        <v-btn variant="text" size="small" @click="store.fetchList">Réessayer</v-btn>
      </div>
    </v-alert>

    <v-sheet v-if="!loading && !errorCode && !items.length" border rounded class="pa-10 text-center">
      <v-icon icon="mdi-account-off-outline" color="neutral" size="42" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucun client</p>
      <p class="text-body-2 text-medium-emphasis mb-0">Aucun client ne correspond à ces filtres.</p>
    </v-sheet>

    <v-card v-else-if="items.length" border flat rounded="lg" class="clients-table-card overflow-hidden">
      <v-data-table-server
        class="clients-table"
        :headers="headers"
        :items="items"
        item-value="id"
        :loading="loading"
        :items-length="pagination.total"
        :items-per-page="pagination.limit"
        :page="pagination.page"
        :items-per-page-options="[10, 20, 50]"
        hover
        @update:page="store.setPage"
        @update:items-per-page="store.setLimit"
        @click:row="(_e: MouseEvent, row: { item: CustomerListItem }) => openOrders(row.item)"
      >
        <template #item.fullName="{ item }">
          <div class="d-flex align-center ga-3 py-1">
            <v-avatar color="secondary" size="36">
              <span class="text-caption font-weight-bold">{{ initials(item) }}</span>
            </v-avatar>
            <div class="min-w-0">
              <div class="font-weight-medium text-truncate">{{ formatNullable(item.fullName) }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">{{ formatNullable(item.email) }}</div>
            </div>
          </div>
        </template>

        <template #item.phoneE164="{ item }">
          <span class="text-body-2">{{ formatPhone(item.phoneE164) }}</span>
        </template>

        <template #item.region="{ item }">
          <div class="d-flex align-center ga-1">
            <v-icon icon="mdi-map-marker-outline" size="16" class="text-medium-emphasis" />
            <span class="text-truncate">{{ formatNullable(item.region ?? item.city) }}</span>
          </div>
        </template>

        <template #item.orderCount="{ item }">
          <v-chip size="small" variant="tonal" color="primary">{{ formatNullable(item.orderCount ?? 0) }}</v-chip>
        </template>

        <template #item.lastOrder="{ item }">
          <div>
            <div class="font-weight-medium">{{ formatNullable(item.lastOrderName) }}</div>
            <div class="text-caption text-medium-emphasis">{{ formatDate(item.lastOrderAt) }}</div>
          </div>
        </template>
      </v-data-table-server>
    </v-card>
  </section>
</template>

<style scoped>
.clients-view {
  min-width: 0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  align-items: center;
}

@media (min-width: 1280px) {
  .filters-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.clients-table-card {
  min-height: 240px;
}

.clients-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

.clients-table :deep(td) {
  height: 52px;
}

.min-w-0 {
  min-width: 0;
}
</style>
