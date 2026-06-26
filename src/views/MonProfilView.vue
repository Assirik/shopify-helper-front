<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { roleMeta, accountStatusMeta, accountStatusKey } from '@/constants/status'
import { formatDate, formatNullable } from '@/utils/format'
import { selfPasswordErrorMessage } from '@/utils/userErrors'
import StatusChip from '@/components/StatusChip.vue'

const auth = useAuthStore()
const router = useRouter()

const user = computed(() => auth.user)

const infoRows = computed(() => [
  { label: 'Nom d’utilisateur', value: formatNullable(user.value?.userName) },
  { label: 'Email', value: formatNullable(user.value?.email) },
  { label: 'Téléphone', value: formatNullable(user.value?.phone) },
])

// ── Changement de mot de passe self-service ────────────────────────────────
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const formValid = ref(false)
const submitting = ref(false)
const error = ref('')

const byteLength = (value: string) => new TextEncoder().encode(value).length

const currentRules = [(v: string) => Boolean(v) || 'Le mot de passe actuel est obligatoire.']
const newRules = [
  (v: string) => Boolean(v) || 'Le nouveau mot de passe est obligatoire.',
  (v: string) => {
    const len = byteLength(v)
    return (len >= 8 && len <= 72) || 'Le mot de passe doit contenir entre 8 et 72 octets.'
  },
]
const confirmRules = [
  (v: string) => v === newPassword.value || 'Les mots de passe ne correspondent pas.',
]

const canSubmit = computed(() => formValid.value && !submitting.value)

async function submit() {
  if (!canSubmit.value) return
  error.value = ''
  // Vérification impérative : la règle Vuetify du champ « Confirmer » n'est pas
  // réévaluée quand on modifie ensuite le nouveau mot de passe.
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  submitting.value = true
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    auth.logout()
    await router.push({ name: 'login', query: { reason: 'password_changed' } })
  } catch (cause) {
    error.value = selfPasswordErrorMessage(cause)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="profile-view">
    <header class="mb-5">
      <h1 class="text-h5 font-weight-bold mb-1">Mon profil</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Consultez vos informations et gérez votre mot de passe
      </p>
    </header>

    <v-row>
      <v-col cols="12" md="6">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">Mes informations</v-card-title>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <StatusChip :table="roleMeta" :value="user?.role" />
              <StatusChip :table="accountStatusMeta" :value="accountStatusKey(user?.isActive ?? true)" />
            </div>

            <div v-for="row in infoRows" :key="row.label" class="info-row d-flex justify-space-between py-2">
              <span class="text-body-2 text-medium-emphasis">{{ row.label }}</span>
              <span class="text-body-2 font-weight-medium text-right">{{ row.value }}</span>
            </div>
            <div class="info-row d-flex justify-space-between py-2">
              <span class="text-body-2 text-medium-emphasis">Membre depuis</span>
              <span class="text-body-2 font-weight-medium text-right">{{ formatDate(user?.createdAt) }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card border flat rounded="lg" class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">Sécurité</v-card-title>
            <v-card-subtitle>Changer mon mot de passe</v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
              {{ error }}
            </v-alert>

            <v-form v-model="formValid" @submit.prevent="submit">
              <v-text-field
                v-model="currentPassword"
                label="Mot de passe actuel"
                :type="showCurrent ? 'text' : 'password'"
                :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
                prepend-inner-icon="mdi-lock-outline"
                :rules="currentRules"
                autocomplete="current-password"
                @click:append-inner="showCurrent = !showCurrent"
              />
              <v-text-field
                v-model="newPassword"
                label="Nouveau mot de passe"
                :type="showNew ? 'text' : 'password'"
                :append-inner-icon="showNew ? 'mdi-eye-off' : 'mdi-eye'"
                prepend-inner-icon="mdi-lock-plus-outline"
                :rules="newRules"
                autocomplete="new-password"
                @click:append-inner="showNew = !showNew"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirmer le nouveau mot de passe"
                :type="showNew ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-check-outline"
                :rules="confirmRules"
                autocomplete="new-password"
              />

              <v-alert type="info" variant="tonal" density="compact" class="mt-2 mb-4">
                Vous serez déconnecté de vos autres sessions après le changement.
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                :loading="submitting"
                :disabled="!canSubmit"
                prepend-icon="mdi-content-save-outline"
              >
                Changer le mot de passe
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<style scoped>
.profile-view {
  min-width: 0;
  max-width: 1100px;
}

.info-row + .info-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
