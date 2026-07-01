<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCouriersStore } from '@/stores/couriers'
import type { Courier, CreateCourierPayload, UpdateCourierPayload } from '@/types/couriers'
import { accountStatusKey, accountStatusMeta } from '@/constants/status'
import { formatDate, formatPhone } from '@/utils/format'
import { toApiFailure } from '@/services/errors'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import CourierFormDialog from '@/components/CourierFormDialog.vue'

const store = useCouriersStore()
const { items, loading, errorCode } = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })
function notify(text: string, color: string) {
  snackbar.value = { show: true, text, color }
}

const headers = [
  { title: 'Livreur', key: 'name', sortable: false, minWidth: 200 },
  { title: 'Téléphone', key: 'phoneE164', sortable: false, width: 180 },
  { title: 'Statut', key: 'isActive', sortable: false, width: 160 },
  { title: 'Créé le', key: 'createdAt', sortable: false, width: 130 },
  { title: 'Actions', key: 'actions', sortable: false, width: 120, align: 'end' as const },
]

const total = computed(() => items.value.length)

const formOpen = ref(false)
const editingCourier = ref<Courier | null>(null)
const formSubmitting = ref(false)
const formGeneralError = ref('')

function openCreate() {
  editingCourier.value = null
  formGeneralError.value = ''
  formOpen.value = true
}

function openEdit(courier: Courier) {
  editingCourier.value = courier
  formGeneralError.value = ''
  formOpen.value = true
}

async function submitForm(payload: CreateCourierPayload | UpdateCourierPayload) {
  formSubmitting.value = true
  formGeneralError.value = ''
  try {
    if (editingCourier.value) {
      await store.updateCourier(editingCourier.value.id, payload as UpdateCourierPayload)
      notify('Livreur modifié.', 'success')
    } else {
      await store.createCourier(payload as CreateCourierPayload)
      notify('Livreur créé.', 'success')
    }
    formOpen.value = false
    await store.fetchCouriers()
  } catch (cause) {
    formGeneralError.value =
      toApiFailure(cause).code === 'NetworkError'
        ? 'Le serveur est injoignable.'
        : 'L’enregistrement a échoué.'
  } finally {
    formSubmitting.value = false
  }
}

async function toggleStatus(courier: Courier) {
  try {
    await store.setStatus(courier.id, !courier.isActive)
    notify(courier.isActive ? 'Livreur désactivé.' : 'Livreur activé.', courier.isActive ? 'warning' : 'success')
  } catch {
    notify('Le changement de statut a échoué.', 'error')
  }
}

onMounted(() => {
  void store.fetchCouriers()
})
</script>

<template>
  <section class="couriers-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h5 font-weight-bold">Livreurs</h1>
          <v-chip color="primary" size="small" variant="flat">{{ total }}</v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Livreurs internes assignables à une expédition et suivis au rapprochement.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" size="large" rounded="lg" @click="openCreate">
        Nouveau livreur
      </v-btn>
    </header>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <ErrorState v-if="errorCode" :loading="loading" class="mb-4" @retry="store.fetchCouriers" />

    <EmptyState
      v-else-if="!loading && !items.length"
      title="Aucun livreur"
      message="Ajoutez le premier livreur interne du helpdesk."
      icon="mdi-moped-outline"
    />

    <v-card
      v-else-if="items.length"
      border
      flat
      rounded="lg"
      class="overflow-hidden"
      role="region"
      aria-label="Liste des livreurs"
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
                  :icon="item.isActive ? 'mdi-account-off-outline' : 'mdi-account-check-outline'"
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

    <CourierFormDialog
      v-model="formOpen"
      :courier="editingCourier"
      :submitting="formSubmitting"
      :general-error="formGeneralError"
      @submit="submitForm"
    />
  </section>
</template>

<style scoped>
.couriers-view {
  min-width: 0;
}

.couriers-view :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
</style>
