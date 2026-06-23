<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAttentionStore, type AttentionFilter } from '@/stores/attention'
import type { AttentionOrder, AttentionReason } from '@/types/attention'
import { toApiFailure } from '@/services/errors'

const store = useAttentionStore()
const { items, counts, pagination, activeFilter, loading, errorCode, selectedIds } = storeToRefs(store)
const snackbar = ref({ show: false, text: '', color: 'neutral' })
const pendingCancellation = ref<AttentionOrder | null>(null)
const cancellationReason = ref('')
const cancellationComment = ref('')
const cancellationReasons = [
  'Client a annulé',
  'Commande en double',
  'Produit indisponible',
  'Coordonnées invalides',
  'Suspicion de commande non fiable',
  'Autre',
]
const cancellationCommentLimit = computed(() =>
  cancellationReason.value ? 500 - cancellationReason.value.length - 3 : 500,
)
const composedCancellationReason = computed(() =>
  cancellationComment.value.trim()
    ? `${cancellationReason.value} — ${cancellationComment.value.trim()}`
    : cancellationReason.value,
)
const cancellationSubmitting = computed(() =>
  pendingCancellation.value ? store.mutatingIds.includes(pendingCancellation.value.id) : false,
)
const bulkLoading = computed(() => selectedIds.value.some(id => store.mutatingIds.includes(id)))

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
  snackbar.value = { show: true, text: `Détail ${row.item.orderName} — écran à venir`, color: 'neutral' }
}

const actionErrorMessage = (cause: unknown) => {
  const code = toApiFailure(cause).code
  const messages: Record<string, string> = {
    OrderNotFound: 'Commande introuvable.',
    OrderConfirmationNotAllowed: 'Cette commande ne peut plus être confirmée.',
    OrderReminderNotAllowed: 'Cette commande ne peut pas être relancée.',
    OrderReminderLimitReached: 'La limite de relances est atteinte.',
    OrderReminderTooSoon: 'Une relance a été envoyée trop récemment.',
    OrderReminderConflict: 'Une relance est déjà en cours, réessayez.',
    OrderPhoneRequired: 'Aucun numéro valide n’est disponible.',
    OrderCancellationNotAllowed: 'Cette commande est déjà annulée.',
    OrderCancelReasonRequired: 'Un motif d’annulation est obligatoire.',
    OrderCancelReasonTooLong: 'Le motif est trop long (500 caractères maximum).',
  }
  return messages[code] || 'L’action n’a pas pu être effectuée.'
}

async function confirmOrder(order: AttentionOrder) {
  try {
    await store.confirm(order.id)
    snackbar.value = { show: true, text: `${order.orderName} confirmée.`, color: 'success' }
  } catch (cause) {
    snackbar.value = { show: true, text: actionErrorMessage(cause), color: 'error' }
  }
}

async function remindOrder(order: AttentionOrder) {
  try {
    await store.remind(order.id)
    snackbar.value = { show: true, text: `Relance envoyée pour ${order.orderName}.`, color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: actionErrorMessage(cause), color: 'error' }
  }
}

function closeCancellationDialog() {
  if (cancellationSubmitting.value) return
  pendingCancellation.value = null
  cancellationReason.value = ''
  cancellationComment.value = ''
}

async function submitCancellation() {
  const order = pendingCancellation.value
  if (!order || !cancellationReason.value || composedCancellationReason.value.length > 500) return

  try {
    await store.cancel(order.id, composedCancellationReason.value)
    closeCancellationDialog()
    snackbar.value = { show: true, text: `${order.orderName} annulée.`, color: 'error' }
  } catch (cause) {
    snackbar.value = { show: true, text: actionErrorMessage(cause), color: 'error' }
  }
}

const bulkSummary = (action: string, total: number, eligible: number, result?: { data: { summary: { succeeded: number; failed: number } } }) => {
  if (!result) return `Aucune commande éligible pour ${action}.`
  const skipped = total - eligible
  const parts = [`${result.data.summary.succeeded} réussie(s)`]
  if (result.data.summary.failed) parts.push(`${result.data.summary.failed} en échec`)
  if (skipped) parts.push(`${skipped} ignorée(s)`)
  return parts.join(' · ')
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
    snackbar.value = { show: true, text: actionErrorMessage(cause), color: 'error' }
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
    snackbar.value = { show: true, text: actionErrorMessage(cause), color: 'error' }
  }
}

const filters: Array<{ key: AttentionFilter; label: string; color?: string, borderColor?: string }> = [
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
        border="sm opacity-25"
        rounded="lg"
        :loading="loading"
        size="large"  
        @click="store.fetchQueue"
      >
        <span class="text-uppercase">Actualiser</span>
      </v-btn>
    </header>

    <div class="d-flex align-center flex-wrap ga-2 mb-4" aria-label="Filtres de la file à traiter">
      <span class="text-caption font-weight-medium text-medium-emphasis mr-1">Raison :</span>
      <v-chip
        v-for="filter in filters"
        :key="filter.key"
        :color="activeFilter === filter.key ? filter.color || 'primary' : undefined"
        :variant="activeFilter === filter.key ? 'tonal' : 'outlined'"
        filter
        outlined
        :aria-pressed="activeFilter === filter.key"
        :aria-label="`${filter.label}, ${filterCount(filter.key)} commande(s)`"
        @click="store.setFilter(filter.key)"
        style="cursor: pointer;"
        :border="activeFilter === filter.key ? `${filter.color || 'primary'} sm opacity-100` : 'sm opacity-10'"
      >
      <v-icon v-if="activeFilter !== filter.key" :color="filter.color || 'primary'">mdi-circle-medium</v-icon>
        {{ filter.label }}
        <span class="ml-2 font-weight-bold">{{ filterCount(filter.key) }}</span>
      </v-chip>
    </div>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <v-alert v-if="errorCode" type="error" variant="tonal" class="mb-4" role="alert">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>La file n’a pas pu être chargée.</span>
        <v-btn variant="text" size="small" @click="store.fetchQueue">Réessayer</v-btn>
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
      <v-icon icon="mdi-check-circle-outline" color="success" size="42" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucune commande à traiter</p>
      <p class="text-body-2 text-medium-emphasis mb-0">La file est à jour pour ce filtre.</p>
    </v-sheet>

    <v-card
      v-else-if="items.length"
      border
      flat
      rounded="lg"
      class="attention-table-card overflow-hidden"
      role="region"
      aria-label="Commandes nécessitant une décision humaine"
    >
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
          <v-chip :color="reasons[item.reason].color" size="small" variant="tonal" :border="`${reasons[item.reason].color} sm opacity-50`">
            <strong>{{ reasons[item.reason].label }}x </strong>
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

        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1" @click.stop>
            <v-tooltip v-if="item.capabilities.canConfirm" text="Confirmer" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-check"
                  color="success"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Confirmer ${item.orderName}`"
                  @click="confirmOrder(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip v-if="item.capabilities.canRemind" text="Relancer" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-refresh"
                  color="primary"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Relancer ${item.orderName}`"
                  @click="remindOrder(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip v-if="item.capabilities.canCancel" text="Annuler" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-close"
                  color="error"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`Annuler ${item.orderName}`"
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

    <v-dialog
      :model-value="Boolean(pendingCancellation)"
      max-width="560"
      persistent
      @update:model-value="value => { if (!value) closeCancellationDialog() }"
    >
      <v-card>
        <v-card-title>Annuler la commande {{ pendingCancellation?.orderName }}</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">Choisissez un motif d’annulation.</p>
          <v-radio-group v-model="cancellationReason" hide-details class="mb-3">
            <v-radio
              v-for="reason in cancellationReasons"
              :key="reason"
              :label="reason"
              :value="reason"
              density="compact"
            />
          </v-radio-group>
          <v-textarea
            v-model="cancellationComment"
            label="Commentaire complémentaire (optionnel)"
            rows="3"
            auto-grow
            counter
            :maxlength="cancellationCommentLimit"
          />
          <v-alert type="warning" variant="tonal" density="compact">
            Cette commande ne sera plus relancée automatiquement.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="cancellationSubmitting" @click="closeCancellationDialog">Retour</v-btn>
          <v-btn
            color="error"
            :loading="cancellationSubmitting"
            :disabled="!cancellationReason || composedCancellationReason.length > 500"
            @click="submitCancellation"
          >
            Confirmer l’annulation
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.attention-view {
  min-width: 0;
}

.attention-table-card {
  min-height: 240px;
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

@media (max-width: 1280px) {
  .message-preview {
    max-width: 190px;
  }
}
</style>
