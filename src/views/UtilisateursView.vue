<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import type { AdminUser, CreateUserPayload, UpdateUserPayload, ValidationDetails } from '@/types/users'
import { roleMeta, accountStatusMeta, accountStatusKey } from '@/constants/status'
import { formatDate, formatDateTime, formatNullable } from '@/utils/format'
import { extractValidationDetails, userActionErrorMessage } from '@/utils/userErrors'
import { toApiFailure } from '@/services/errors'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import UserFormDialog from '@/components/UserFormDialog.vue'
import UserPasswordResetDialog from '@/components/UserPasswordResetDialog.vue'

const store = useUsersStore()
const auth = useAuthStore()
const { items, pagination, filters, loading, errorCode } = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })
function notify(text: string, color: string) {
  snackbar.value = { show: true, text, color }
}

const headers = [
  { title: 'Utilisateur', key: 'userName', sortable: false, minWidth: 180 },
  { title: 'Email', key: 'email', sortable: false, minWidth: 200 },
  { title: 'Téléphone', key: 'phone', sortable: false, width: 150 },
  { title: 'Rôle', key: 'role', sortable: false, width: 160 },
  { title: 'Statut', key: 'isActive', sortable: false, width: 190 },
  { title: 'Créé le', key: 'createdAt', sortable: false, width: 130 },
  { title: 'Actions', key: 'actions', sortable: false, width: 140, align: 'end' as const },
]

const roleFilterItems = [
  { value: 'all', title: 'Tous les rôles' },
  { value: 'ADMIN', title: roleMeta.ADMIN.label },
  { value: 'USER', title: roleMeta.USER.label },
  { value: 'DEVELOPER', title: roleMeta.DEVELOPER.label },
]
const activeFilterItems = [
  { value: 'all', title: 'Tous les statuts' },
  { value: 'active', title: 'Actif' },
  { value: 'disabled', title: 'Désactivé' },
]

const hasActiveFilters = computed(
  () => Boolean(filters.value.search.trim()) || filters.value.role !== 'all' || filters.value.active !== 'all',
)

const isSelf = (user: AdminUser) => user.id === auth.user?.id

// Recherche : déclenchement différé pour ne pas spammer l'API à chaque frappe.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => filters.value.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => void store.applyFilters(), 350)
  },
)

// ── Dialog Créer / Éditer ──────────────────────────────────────────────────
const formOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const formSubmitting = ref(false)
const formFieldErrors = ref<ValidationDetails>({})
const formGeneralError = ref('')

function openCreate() {
  editingUser.value = null
  formFieldErrors.value = {}
  formGeneralError.value = ''
  formOpen.value = true
}

function openEdit(user: AdminUser) {
  editingUser.value = user
  formFieldErrors.value = {}
  formGeneralError.value = ''
  formOpen.value = true
}

async function submitForm(payload: CreateUserPayload | UpdateUserPayload) {
  formSubmitting.value = true
  formFieldErrors.value = {}
  formGeneralError.value = ''
  try {
    if (editingUser.value) {
      await store.updateUser(editingUser.value.id, payload as UpdateUserPayload)
      notify('Utilisateur modifié.', 'success')
    } else {
      await store.createUser(payload as CreateUserPayload)
      notify('Utilisateur créé.', 'success')
    }
    formOpen.value = false
    await store.fetchUsers()
  } catch (cause) {
    const details = extractValidationDetails(cause)
    if (details) formFieldErrors.value = details
    const code = toApiFailure(cause).code
    if (code === 'UserAlreadyExists') {
      formFieldErrors.value = {
        ...formFieldErrors.value,
        email: 'Cet utilisateur existe déjà (nom ou email).',
        userName: 'Cet utilisateur existe déjà (nom ou email).',
      }
    } else if (!details || code === 'CannotChangeOwnRole') {
      formGeneralError.value = userActionErrorMessage(cause)
    }
  } finally {
    formSubmitting.value = false
  }
}

// ── Dialog Réinitialiser le mot de passe ───────────────────────────────────
const resetOpen = ref(false)
const resetUser = ref<AdminUser | null>(null)
const resetSubmitting = ref(false)
const resetGeneralError = ref('')

function openReset(user: AdminUser) {
  resetUser.value = user
  resetGeneralError.value = ''
  resetOpen.value = true
}

async function submitReset(password: string) {
  if (!resetUser.value) return
  resetSubmitting.value = true
  resetGeneralError.value = ''
  try {
    await store.resetUserPassword(resetUser.value.id, password)
    resetOpen.value = false
    notify('Mot de passe réinitialisé.', 'success')
  } catch (cause) {
    resetGeneralError.value = userActionErrorMessage(cause)
  } finally {
    resetSubmitting.value = false
  }
}

// ── Activer / Désactiver ───────────────────────────────────────────────────
async function toggleStatus(user: AdminUser) {
  try {
    await store.setStatus(user.id, !user.isActive)
    notify(user.isActive ? 'Compte désactivé.' : 'Compte activé.', user.isActive ? 'warning' : 'success')
  } catch (cause) {
    notify(userActionErrorMessage(cause), 'error')
  }
}

onMounted(() => {
  void store.fetchUsers()
})
</script>

<template>
  <section class="users-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h5 font-weight-bold">Utilisateurs</h1>
          <v-chip color="primary" size="small" variant="flat">{{ pagination.total }}</v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Gérez les comptes, rôles et accès du helpdesk
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" size="large" rounded="lg" @click="openCreate">
        Nouvel utilisateur
      </v-btn>
    </header>

    <div class="d-flex flex-wrap ga-3 mb-4">
      <v-text-field
        v-model="filters.search"
        placeholder="Rechercher (nom, email, téléphone)…"
        prepend-inner-icon="mdi-magnify"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
        style="min-width: 280px; flex: 1 1 280px"
      />
      <v-select
        v-model="filters.role"
        :items="roleFilterItems"
        density="comfortable"
        variant="outlined"
        hide-details
        style="max-width: 220px"
        @update:model-value="store.applyFilters"
      />
      <v-select
        v-model="filters.active"
        :items="activeFilterItems"
        density="comfortable"
        variant="outlined"
        hide-details
        style="max-width: 220px"
        @update:model-value="store.applyFilters"
      />
    </div>

    <v-progress-linear v-if="loading && !items.length" indeterminate color="primary" class="mb-3" />

    <ErrorState v-if="errorCode" :loading="loading" class="mb-4" @retry="store.fetchUsers" />

    <EmptyState
      v-else-if="!loading && !items.length"
      title="Aucun utilisateur"
      :message="hasActiveFilters ? 'Aucun utilisateur ne correspond à ces filtres.' : 'Créez le premier utilisateur du helpdesk.'"
      icon="mdi-account-multiple-outline"
      :action-label="hasActiveFilters ? 'Réinitialiser les filtres' : ''"
      @action="store.resetFilters"
    />

    <v-card
      v-else-if="items.length"
      border
      flat
      rounded="lg"
      class="overflow-hidden"
      role="region"
      aria-label="Liste des utilisateurs"
    >
      <v-data-table-server
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
      >
        <template #item.userName="{ item }">
          <div class="d-flex align-center ga-2 py-1">
            <span class="font-weight-medium">{{ item.userName }}</span>
            <v-chip v-if="isSelf(item)" size="x-small" color="primary" variant="tonal">Vous</v-chip>
          </div>
        </template>

        <template #item.email="{ item }">
          <span class="text-body-2">{{ item.email }}</span>
        </template>

        <template #item.phone="{ item }">
          <span :class="item.phone ? '' : 'text-medium-emphasis'">{{ formatNullable(item.phone) }}</span>
        </template>

        <template #item.role="{ item }">
          <StatusChip :table="roleMeta" :value="item.role" />
        </template>

        <template #item.isActive="{ item }">
          <div class="d-flex flex-column ga-0">
            <StatusChip :table="accountStatusMeta" :value="accountStatusKey(item.isActive)" />
            <span v-if="!item.isActive && item.disabledAt" class="text-caption text-medium-emphasis mt-1">
              depuis le {{ formatDate(item.disabledAt) }}
            </span>
          </div>
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
                  :aria-label="`Modifier ${item.userName}`"
                  @click="openEdit(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip text="Réinitialiser le mot de passe" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-key-outline"
                  variant="text"
                  size="default"
                  :aria-label="`Réinitialiser le mot de passe de ${item.userName}`"
                  @click="openReset(item)"
                />
              </template>
            </v-tooltip>
            <v-tooltip
              :text="isSelf(item)
                ? 'Vous ne pouvez pas désactiver votre propre compte'
                : (item.isActive ? 'Désactiver' : 'Activer')"
              location="top"
            >
              <template #activator="{ props }">
                <span v-bind="props">
                  <v-btn
                    :icon="item.isActive ? 'mdi-account-off-outline' : 'mdi-account-check-outline'"
                    :color="item.isActive ? 'error' : 'success'"
                    variant="text"
                    size="default"
                    :disabled="isSelf(item)"
                    :loading="store.mutatingIds.includes(item.id)"
                    :aria-label="`${item.isActive ? 'Désactiver' : 'Activer'} ${item.userName}`"
                    @click="toggleStatus(item)"
                  />
                </span>
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>

    <UserFormDialog
      v-model="formOpen"
      :user="editingUser"
      :is-self="editingUser ? isSelf(editingUser) : false"
      :submitting="formSubmitting"
      :field-errors="formFieldErrors"
      :general-error="formGeneralError"
      @submit="submitForm"
    />

    <UserPasswordResetDialog
      v-model="resetOpen"
      :user-name="resetUser?.userName"
      :submitting="resetSubmitting"
      :general-error="resetGeneralError"
      @submit="submitReset"
    />
  </section>
</template>

<style scoped>
.users-view {
  min-width: 0;
}

.users-view :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
</style>
