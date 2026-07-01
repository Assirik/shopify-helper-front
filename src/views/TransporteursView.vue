<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCarriersStore } from '@/stores/carriers'
import type { Carrier, CreateCarrierPayload, UpdateCarrierPayload } from '@/types/carriers'
import { accountStatusKey, accountStatusMeta } from '@/constants/status'
import { formatAmount, formatDate, formatPhone } from '@/utils/format'
import { toApiFailure } from '@/services/errors'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import CarrierFormDialog from '@/components/CarrierFormDialog.vue'

const store = useCarriersStore()
const { items, loading, errorCode } = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })
function notify(text: string, color: string) {
  snackbar.value = { show: true, text, color }
}

const headers = [
  { title: 'Transporteur', key: 'name', sortable: false, minWidth: 200 },
  { title: 'Téléphone', key: 'phoneE164', sortable: false, width: 170 },
  { title: 'Prix indicatif', key: 'defaultPrice', sortable: false, width: 150 },
  { title: 'Statut', key: 'isActive', sortable: false, width: 150 },
  { title: 'Créé le', key: 'createdAt', sortable: false, width: 120 },
  { title: 'Actions', key: 'actions', sortable: false, width: 120, align: 'end' as const },
]

const total = computed(() => items.value.length)

const formOpen = ref(false)
const editingCarrier = ref<Carrier | null>(null)
const formSubmitting = ref(false)
const formGeneralError = ref('')

function openCreate() {
  editingCarrier.value = null
  formGeneralError.value = ''
  formOpen.value = true
}

function openEdit(carrier: Carrier) {
  editingCarrier.value = carrier
  formGeneralError.value = ''
  formOpen.value = true
}

async function submitForm(payload: CreateCarrierPayload | UpdateCarrierPayload) {
  formSubmitting.value = true
  formGeneralError.value = ''
  try {
    if (editingCarrier.value) {
      await store.updateCarrier(editingCarrier.value.id, payload as UpdateCarrierPayload)
      notify('Transporteur modifié.', 'success')
    } else {
      await store.createCarrier(payload as CreateCarrierPayload)
      notify('Transporteur créé.', 'success')
    }
    formOpen.value = false
    await store.fetchCarriers()
  } catch (cause) {
    formGeneralError.value =
      toApiFailure(cause).code === 'NetworkError'
        ? 'Le serveur est injoignable.'
        : 'L’enregistrement a échoué.'
  } finally {
    formSubmitting.value = false
  }
}

async function toggleStatus(carrier: Carrier) {
  try {
    await store.setStatus(carrier.id, !carrier.isActive)
    notify(carrier.isActive ? 'Transporteur désactivé.' : 'Transporteur activé.', carrier.isActive ? 'warning' : 'success')
  } catch {
    notify('Le changement de statut a échoué.', 'error')
  }
}

onMounted(() => {
  void store.fetchCarriers()
})
</script>

<template>
  <section class="carriers-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h5 font-weight-bold">Transporteurs</h1>
          <v-chip color="primary" size="small" variant="flat">{{ total }}</v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Transporteurs tiers (hors Dakar) assignables à une expédition et payés au rapprochement.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" size="large" rounded="lg" @click="openCreate">
        Nouveau transporteur
      </v-btn>
    </header>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <ErrorState v-if="errorCode" :loading="loading" class="mb-4" @retry="store.fetchCarriers" />

    <EmptyState
      v-else-if="!loading && !items.length"
      title="Aucun transporteur"
      message="Ajoutez le premier transporteur tiers du helpdesk."
      icon="mdi-truck-outline"
    />

    <v-card
      v-else-if="items.length"
      border
      flat
      rounded="lg"
      class="overflow-hidden"
      role="region"
      aria-label="Liste des transporteurs"
    >
      <v-data-table
        :headers="headers"
        :items="items"
        item-value="id"
        :loading="loading"
        hide-default-footer
        :items-per-page="-1"
        hover
      >
        <template #item.name="{ item }">
          <span class="font-weight-medium">{{ item.name }}</span>
        </template>

        <template #item.phoneE164="{ item }">
          <span :class="item.phoneE164 ? '' : 'text-medium-emphasis'">{{ formatPhone(item.phoneE164) }}</span>
        </template>

        <template #item.defaultPrice="{ item }">
          <span :class="item.defaultPrice != null ? '' : 'text-medium-emphasis'">
            {{ item.defaultPrice != null ? formatAmount(item.defaultPrice, 'XOF') : '—' }}
          </span>
        </template>

        <template #item.isActive="{ item }">
          <StatusChip :table="accountStatusMeta" :value="accountStatusKey(item.isActive)" />
        </template>

        <template #item.createdAt="{ item }">
          <span class="text-body-2">{{ formatDate(item.createdAt) }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="Modifier" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil"
                  variant="text"
                  size="default"
                  :aria-label="`Modifier ${item.name}`"
                  @click="openEdit(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip :text="item.isActive ? 'Désactiver' : 'Activer'" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :icon="item.isActive ? 'mdi-truck-remove-outline' : 'mdi-truck-check-outline'"
                  :color="item.isActive ? 'error' : 'success'"
                  variant="text"
                  size="default"
                  :loading="store.mutatingIds.includes(item.id)"
                  :aria-label="`${item.isActive ? 'Désactiver' : 'Activer'} ${item.name}`"
                  @click="toggleStatus(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>

    <CarrierFormDialog
      v-model="formOpen"
      :carrier="editingCarrier"
      :submitting="formSubmitting"
      :general-error="formGeneralError"
      @submit="submitForm"
    />
  </section>
</template>

<style scoped>
.carriers-view {
  min-width: 0;
}

.carriers-view :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
</style>
