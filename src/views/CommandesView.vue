<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '@/stores/orders'
import { orderActionCapabilities, type OrderListItem } from '@/types/orders'
import {
  customerConfirmationStatusMeta,
  notificationStatusMeta,
} from '@/constants/status'
import { formatAmount, formatDateTime, formatNullable, formatPhone } from '@/utils/format'
import { orderActionErrorMessage } from '@/utils/orderErrors'
import { bulkSummary } from '@/utils/bulkSummary'
import StatusChip from '@/components/StatusChip.vue'
import CancelOrderDialog from '@/components/CancelOrderDialog.vue'

const store = useOrdersStore()
const router = useRouter()
const route = useRoute()
const { items, pagination, filters, loading, errorCode, selectedIds } = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })
const pendingCancellation = ref<OrderListItem | null>(null)

// Filtres locaux (appliqués au store via applyFilters).
const orderNameInput = ref('')
const phoneInput = ref('')
const confirmationStatus = ref<string | null>(null)
const notificationStatus = ref<string | null>(null)
const codFilter = ref<boolean | null>(null)

const confirmationOptions = Object.entries(customerConfirmationStatusMeta).map(([value, meta]) => ({
  value,
  title: meta.label,
}))
const notificationOptions = Object.entries(notificationStatusMeta).map(([value, meta]) => ({
  value,
  title: meta.label,
}))
const codOptions = [
  { value: true, title: 'COD uniquement' },
  { value: false, title: 'Hors COD' },
]

const headers = [
  { title: 'N°', key: 'shopifyOrderName', sortable: false, width: 110 },
  { title: 'Client', key: 'customerName', sortable: false, minWidth: 190 },
  { title: 'Région', key: 'region', sortable: false, width: 140 },
  { title: 'Montant', key: 'amount', sortable: false, width: 150 },
  { title: 'Confirmation', key: 'customerConfirmationStatus', sortable: false, width: 160 },
  { title: 'Notification', key: 'notificationStatus', sortable: false, width: 150 },
  { title: 'Date', key: 'createdAt', sortable: false, width: 150 },
  { title: 'Actions', key: 'actions', sortable: false, width: 130, align: 'end' as const },
]

const bulkLoading = computed(() => selectedIds.value.some((id) => store.mutatingIds.includes(id)))
const hasActiveFilters = computed(
  () =>
    Boolean(orderNameInput.value) ||
    Boolean(phoneInput.value) ||
    confirmationStatus.value !== null ||
    notificationStatus.value !== null ||
    codFilter.value !== null,
)

function applyFilters() {
  void store.applyFilters({
    orderName: orderNameInput.value,
    phone: phoneInput.value,
    customerConfirmationStatus: confirmationStatus.value,
    status: notificationStatus.value,
    cod: codFilter.value,
  })
}

function resetFilters() {
  orderNameInput.value = ''
  phoneInput.value = ''
  confirmationStatus.value = null
  notificationStatus.value = null
  codFilter.value = null
  store.resetFilters()
  void store.fetchList()
}

function openDetail(_event: MouseEvent, row: { item: OrderListItem }) {
  void router.push({ name: 'commande-detail', params: { id: row.item.id } })
}

function regionLabel(order: OrderListItem) {
  return formatNullable(order.deliveryRegion ?? order.shippingRegion)
}

const cancellationSubmitting = computed(() =>
  pendingCancellation.value ? store.mutatingIds.includes(pendingCancellation.value.id) : false,
)

async function confirmOrder(order: OrderListItem) {
  try {
    await store.confirm(order.id)
    snackbar.value = { show: true, text: `${order.shopifyOrderName} confirmée.`, color: 'success' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function remindOrder(order: OrderListItem) {
  try {
    await store.remind(order.id)
    snackbar.value = { show: true, text: `Relance envoyée pour ${order.shopifyOrderName}.`, color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitCancellation(reason: string) {
  const order = pendingCancellation.value
  if (!order) return
  try {
    await store.cancel(order.id, reason)
    pendingCancellation.value = null
    snackbar.value = { show: true, text: `${order.shopifyOrderName} annulée.`, color: 'error' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function bulkConfirmOrders() {
  const total = selectedIds.value.length
  const eligible = store.selectedConfirmableIds.length
  try {
    const result = await store.bulkConfirm()
    snackbar.value = {
      show: true,
      text: bulkSummary('la confirmation', total, eligible, result),
      color: result?.data.summary.failed ? 'warning' : 'success',
    }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function bulkRemindOrders() {
  const total = selectedIds.value.length
  const eligible = store.selectedRemindableIds.length
  try {
    const result = await store.bulkRemind()
    snackbar.value = {
      show: true,
      text: bulkSummary('la relance', total, eligible, result),
      color: result?.data.summary.failed ? 'warning' : 'info',
    }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

onMounted(() => {
  // Pré-remplissage depuis la navigation Clients ou Dashboard.
  const phone = route.query.phone
  const status = route.query.customerConfirmationStatus
  const initialFilters: Partial<typeof filters.value> = {}

  if (typeof phone === 'string' && phone) {
    phoneInput.value = phone
    initialFilters.phone = phone
  }
  // On n'accepte qu'un statut connu : une query inattendue ne pollue pas le select.
  if (typeof status === 'string' && status in customerConfirmationStatusMeta) {
    confirmationStatus.value = status
    initialFilters.customerConfirmationStatus = status
  }

  if (Object.keys(initialFilters).length) void store.applyFilters(initialFilters)
  else void store.fetchList()
})
</script>

<template>
  <section class="orders-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Commandes</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Toutes les commandes Shopify, filtrables par statut et numéro.
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
        <v-text-field
          v-model="phoneInput"
          label="Téléphone"
          prepend-inner-icon="mdi-phone-outline"
          hide-details
          clearable
          @keyup.enter="applyFilters"
          @click:clear="applyFilters"
        />
        <v-select
          v-model="confirmationStatus"
          label="Statut de confirmation"
          :items="confirmationOptions"
          hide-details
          clearable
          @update:model-value="applyFilters"
        />
        <v-select
          v-model="notificationStatus"
          label="Statut de notification"
          :items="notificationOptions"
          hide-details
          clearable
          @update:model-value="applyFilters"
        />
        <v-select
          v-model="codFilter"
          label="Paiement"
          :items="codOptions"
          hide-details
          clearable
          @update:model-value="applyFilters"
        />
        <div class="d-flex align-center ga-2">
          <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="applyFilters">
            Filtrer
          </v-btn>
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
        <span>Les commandes n’ont pas pu être chargées.</span>
        <v-btn variant="text" size="small" @click="store.fetchList">Réessayer</v-btn>
      </div>
    </v-alert>

    <v-slide-y-transition>
      <v-sheet
        v-if="selectedIds.length"
        border
        rounded="lg"
        class="d-flex align-center flex-wrap ga-3 px-4 py-2 mb-3"
      >
        <span class="font-weight-medium">{{ selectedIds.length }} sélectionnée(s)</span>
        <v-divider vertical class="mx-1" />
        <v-btn
          color="success"
          size="small"
          prepend-icon="mdi-check-all"
          :loading="bulkLoading"
          :disabled="!store.selectedConfirmableIds.length || bulkLoading"
          @click="bulkConfirmOrders"
        >
          Confirmer ({{ store.selectedConfirmableIds.length }})
        </v-btn>
        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="bulkLoading"
          :disabled="!store.selectedRemindableIds.length || bulkLoading"
          @click="bulkRemindOrders"
        >
          Relancer ({{ store.selectedRemindableIds.length }})
        </v-btn>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="Tout désélectionner"
          :disabled="bulkLoading"
          @click="selectedIds = []"
        />
      </v-sheet>
    </v-slide-y-transition>

    <v-sheet v-if="!loading && !errorCode && !items.length" border rounded class="pa-10 text-center">
      <v-icon icon="mdi-cart-off" color="neutral" size="42" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucune commande</p>
      <p class="text-body-2 text-medium-emphasis mb-0">Aucune commande ne correspond à ces filtres.</p>
    </v-sheet>

    <v-card v-else-if="items.length" border flat rounded="lg" class="orders-table-card overflow-hidden">
      <v-data-table-server
        v-model="selectedIds"
        class="orders-table"
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
        @click:row="openDetail"
      >
        <template #item.shopifyOrderName="{ item }">
          <span class="font-weight-bold text-primary">{{ item.shopifyOrderName }}</span>
        </template>

        <template #item.customerName="{ item }">
          <div class="py-1">
            <div class="font-weight-medium text-truncate">{{ formatNullable(item.customerName) }}</div>
            <div class="text-caption text-medium-emphasis">{{ formatPhone(item.customerPhoneE164) }}</div>
          </div>
        </template>

        <template #item.region="{ item }">
          <div class="d-flex align-center ga-1">
            <v-icon icon="mdi-map-marker-outline" size="16" class="text-medium-emphasis" />
            <span class="text-truncate">{{ regionLabel(item) }}</span>
          </div>
        </template>

        <template #item.amount="{ item }">
          <div class="d-flex align-center ga-2 flex-wrap">
            <span class="font-weight-medium">{{ formatAmount(item.totalPrice, item.currency) }}</span>
            <v-chip v-if="item.isCashOnDelivery" size="x-small" color="primary" variant="tonal">COD</v-chip>
          </div>
        </template>

        <template #item.customerConfirmationStatus="{ item }">
          <StatusChip :table="customerConfirmationStatusMeta" :value="item.customerConfirmationStatus" />
        </template>

        <template #item.notificationStatus="{ item }">
          <StatusChip :table="notificationStatusMeta" :value="item.notificationStatus" />
        </template>

        <template #item.createdAt="{ item }">
          <span class="text-body-2">{{ formatDateTime(item.createdAt) }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1" @click.stop>
            <v-tooltip v-if="orderActionCapabilities(item.customerConfirmationStatus).canConfirm" text="Confirmer" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-check"
                  color="success"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Confirmer ${item.shopifyOrderName}`"
                  @click="confirmOrder(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip v-if="orderActionCapabilities(item.customerConfirmationStatus).canRemind" text="Relancer" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-refresh"
                  color="primary"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Relancer ${item.shopifyOrderName}`"
                  @click="remindOrder(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip v-if="orderActionCapabilities(item.customerConfirmationStatus).canCancel" text="Annuler" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-close"
                  color="error"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Annuler ${item.shopifyOrderName}`"
                  @click="pendingCancellation = item"
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

    <CancelOrderDialog
      :model-value="Boolean(pendingCancellation)"
      :order-name="pendingCancellation?.shopifyOrderName"
      :submitting="cancellationSubmitting"
      @update:model-value="(value) => { if (!value) pendingCancellation = null }"
      @confirm="submitCancellation"
    />
  </section>
</template>

<style scoped>
.orders-view {
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

.orders-table-card {
  min-height: 240px;
}

.orders-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

.orders-table :deep(td) {
  height: 46px;
}
</style>
