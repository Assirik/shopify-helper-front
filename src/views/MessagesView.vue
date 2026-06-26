<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMessagesStore } from '@/stores/messages'
import type { MessageListItem } from '@/types/messages'
import {
  channelMeta,
  messageStatusMeta,
  templatePurposeMeta,
  providerLabel,
  formatProvider,
} from '@/constants/status'
import { formatDateTime, formatNullable } from '@/utils/format'
import { messageRetryErrorMessage } from '@/utils/orderErrors'
import StatusChip from '@/components/StatusChip.vue'

const store = useMessagesStore()
const router = useRouter()
const { items, pagination, loading, errorCode } = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })

const orderNameInput = ref('')
const statusFilter = ref<string | null>(null)
const channelFilter = ref<string | null>(null)
const providerFilter = ref<string | null>(null)

const statusOptions = Object.entries(messageStatusMeta).map(([value, meta]) => ({ value, title: meta.label }))
const channelOptions = Object.entries(channelMeta).map(([value, meta]) => ({ value, title: meta.label }))
const providerOptions = Object.entries(providerLabel).map(([value, title]) => ({ value, title }))

const hasActiveFilters = computed(
  () =>
    Boolean(orderNameInput.value) ||
    statusFilter.value !== null ||
    channelFilter.value !== null ||
    providerFilter.value !== null,
)

const headers = [
  { title: 'Commande', key: 'orderName', sortable: false, width: 130 },
  { title: 'Canal', key: 'channel', sortable: false, width: 130 },
  { title: 'Provider', key: 'provider', sortable: false, width: 110 },
  { title: 'Objet', key: 'templatePurpose', sortable: false, minWidth: 200 },
  { title: 'Statut', key: 'status', sortable: false, width: 130 },
  { title: 'Tentatives', key: 'attemptCount', sortable: false, width: 110, align: 'center' as const },
  { title: 'Date', key: 'createdAt', sortable: false, width: 150 },
  { title: 'Actions', key: 'actions', sortable: false, width: 110, align: 'end' as const },
]

function applyFilters() {
  void store.applyFilters({
    orderName: orderNameInput.value,
    status: statusFilter.value,
    channel: channelFilter.value,
    provider: providerFilter.value,
  })
}

function resetFilters() {
  orderNameInput.value = ''
  statusFilter.value = null
  channelFilter.value = null
  providerFilter.value = null
  store.resetFilters()
  void store.fetchList()
}

function openMessage(_event: MouseEvent, row: { item: MessageListItem }) {
  void router.push({ name: 'message-detail', params: { id: row.item.id } })
}

function openOrder(message: MessageListItem) {
  if (!message.orderId) return
  void router.push({ name: 'commande-detail', params: { id: message.orderId } })
}

async function retryMessage(message: MessageListItem) {
  try {
    await store.retry(message.id)
    snackbar.value = { show: true, text: 'Nouvel envoi du message lancé.', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: messageRetryErrorMessage(cause), color: 'error' }
  }
}

onMounted(() => {
  void store.fetchList()
})
</script>

<template>
  <section class="messages-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Messages</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Journal des messages WhatsApp et SMS envoyés aux clients.
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
          v-model="orderNameInput"
          label="N° de commande"
          prepend-inner-icon="mdi-pound"
          hide-details
          clearable
          @keyup.enter="applyFilters"
          @click:clear="applyFilters"
        />
        <v-select v-model="statusFilter" label="Statut" :items="statusOptions" hide-details clearable @update:model-value="applyFilters" />
        <v-select v-model="channelFilter" label="Canal" :items="channelOptions" hide-details clearable @update:model-value="applyFilters" />
        <v-select v-model="providerFilter" label="Provider" :items="providerOptions" hide-details clearable @update:model-value="applyFilters" />
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
        <span>Les messages n’ont pas pu être chargés.</span>
        <v-btn variant="text" size="small" @click="store.fetchList">Réessayer</v-btn>
      </div>
    </v-alert>

    <v-sheet v-if="!loading && !errorCode && !items.length" border rounded class="pa-10 text-center">
      <v-icon icon="mdi-message-off-outline" color="neutral" size="42" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucun message</p>
      <p class="text-body-2 text-medium-emphasis mb-0">Aucun message ne correspond à ces filtres.</p>
    </v-sheet>

    <v-card v-else-if="items.length" border flat rounded="lg" class="messages-table-card overflow-hidden">
      <v-data-table-server
        class="messages-table"
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
        @click:row="openMessage"
      >
        <template #item.orderName="{ item }">
          <div @click.stop>
            <v-btn
              v-if="item.orderId"
              variant="text"
              size="small"
              class="px-1 text-primary font-weight-bold"
              @click="openOrder(item)"
            >
              {{ formatNullable(item.orderName) }}
            </v-btn>
            <span v-else class="font-weight-bold">{{ formatNullable(item.orderName) }}</span>
          </div>
        </template>

        <template #item.channel="{ item }">
          <div class="d-flex align-center ga-1">
            <StatusChip :table="channelMeta" :value="item.channel" />
            <v-tooltip v-if="item.fallbackOfMessageId || item.fallbackOf" text="Repli d’un message WhatsApp en échec" location="top">
              <template #activator="{ props }">
                <v-icon v-bind="props" icon="mdi-subdirectory-arrow-right" size="16" color="neutral" />
              </template>
            </v-tooltip>
          </div>
        </template>

        <template #item.provider="{ item }">
          <span class="text-body-2">{{ formatProvider(item.provider) }}</span>
        </template>

        <template #item.templatePurpose="{ item }">
          <StatusChip v-if="item.templatePurpose" :table="templatePurposeMeta" :value="item.templatePurpose" :show-icon="false" />
          <span v-else class="text-body-2 text-medium-emphasis">{{ formatNullable(item.templateName) }}</span>
        </template>

        <template #item.status="{ item }">
          <StatusChip :table="messageStatusMeta" :value="item.status" />
        </template>

        <template #item.attemptCount="{ item }">
          <span class="text-body-2">{{ formatNullable(item.attemptCount) }}</span>
        </template>

        <template #item.createdAt="{ item }">
          <span class="text-body-2">{{ formatDateTime(item.createdAt) }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end" @click.stop>
            <v-tooltip v-if="item.status === 'failed'" text="Réessayer" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-refresh"
                  color="error"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Réessayer le message ${item.orderName ?? ''}`"
                  @click="retryMessage(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>

<style scoped>
.messages-view {
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.messages-table-card {
  min-height: 240px;
}

.messages-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

.messages-table :deep(td) {
  height: 48px;
}
</style>
