<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { palettes } from '@/theme/palettes'
import { authService } from '@/services/auth.service'
import { toApiFailure } from '@/services/errors'
import { bootstrapErrorMessage, extractValidationDetails } from '@/utils/userErrors'
import type { ValidationDetails } from '@/types/users'

const router = useRouter()
const themeStore = useThemeStore()

const isDark = computed(() => palettes.find((p) => p.key === themeStore.current)?.dark ?? false)
function toggleTheme() {
  const target = palettes.find((p) => p.dark === !isDark.value)
  if (target) themeStore.setPalette(target.key)
}

const secret = ref('')
const userName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const showSecret = ref(false)
const showPassword = ref(false)

const formValid = ref(false)
const submitting = ref(false)
const generalError = ref('')
const secretError = ref('')
const fieldErrors = ref<ValidationDetails>({})

/** Bascule sur l'écran d'information quand un admin existe déjà (409). */
const alreadyDone = ref(false)

const byteLength = (value: string) => new TextEncoder().encode(value).length

const required = (label: string) => (v: string) => Boolean(v?.trim()) || `${label} est obligatoire.`
const rules = {
  secret: [required('Le secret de configuration')],
  userName: [
    required('Le nom d’utilisateur'),
    (v: string) => /^[a-zA-Z0-9._-]{3,50}$/.test(v) || '3 à 50 caractères : lettres, chiffres, . _ -',
  ],
  email: [
    required('L’email'),
    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Format d’email invalide.',
  ],
  phone: [(v: string) => !v || (v.length >= 1 && v.length <= 30) || 'Le téléphone doit faire 1 à 30 caractères.'],
  password: [
    required('Le mot de passe'),
    (v: string) => {
      const len = byteLength(v)
      return (len >= 8 && len <= 72) || 'Le mot de passe doit contenir entre 8 et 72 octets.'
    },
  ],
  confirm: [(v: string) => v === password.value || 'Les mots de passe ne correspondent pas.'],
}

const canSubmit = computed(() => formValid.value && !submitting.value)

async function submit() {
  if (!canSubmit.value) return
  generalError.value = ''
  secretError.value = ''
  fieldErrors.value = {}
  // Vérification impérative : la règle Vuetify du champ « Confirmer » n'est pas
  // réévaluée quand on modifie ensuite le mot de passe.
  if (password.value !== confirmPassword.value) {
    generalError.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  submitting.value = true
  try {
    await authService.bootstrap(
      {
        userName: userName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || undefined,
        password: password.value,
      },
      secret.value,
    )
    await router.push({ name: 'login', query: { reason: 'bootstrap_completed' } })
  } catch (cause) {
    const code = toApiFailure(cause).code
    if (code === 'BootstrapAlreadyCompleted') {
      alreadyDone.value = true
    } else if (code === 'InvalidBootstrapSecret') {
      secretError.value = bootstrapErrorMessage(cause)
    } else if (code === 'ValidationFailed') {
      fieldErrors.value = extractValidationDetails(cause) ?? {}
      generalError.value = bootstrapErrorMessage(cause)
    } else {
      generalError.value = bootstrapErrorMessage(cause)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bootstrap-screen">
    <v-btn
      class="bootstrap-theme-toggle"
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      :aria-label="isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
      @click="toggleTheme"
    />

    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="9" md="6" lg="5" xl="4">
          <div class="text-center mb-6">
            <v-avatar color="primary" rounded="lg" size="56" class="mb-3">
              <v-icon icon="mdi-cog-outline" size="32" />
            </v-avatar>
            <h1 class="text-h4 font-weight-bold">Première configuration</h1>
            <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
              Créez le compte administrateur initial
            </p>
          </div>

          <!-- Écran d'information : un administrateur existe déjà -->
          <v-card v-if="alreadyDone" border flat rounded="xl" class="pa-4 text-center">
            <v-avatar color="info" variant="tonal" rounded="lg" size="48" class="mb-3">
              <v-icon icon="mdi-information-outline" size="28" />
            </v-avatar>
            <p class="text-subtitle-1 font-weight-medium mb-1">Un administrateur existe déjà</p>
            <p class="text-body-2 text-medium-emphasis mb-4">
              La configuration initiale a déjà été effectuée.
            </p>
            <v-btn color="primary" prepend-icon="mdi-login" @click="router.push({ name: 'login' })">
              Aller à la connexion
            </v-btn>
          </v-card>

          <!-- Formulaire de bootstrap -->
          <v-card v-else border flat rounded="xl" class="pa-2">
            <v-card-text>
              <v-alert v-if="generalError" type="error" variant="tonal" density="compact" class="mb-4" role="alert">
                {{ generalError }}
              </v-alert>

              <v-form v-model="formValid" @submit.prevent="submit">
                <v-text-field
                  v-model="secret"
                  label="Secret de configuration"
                  :type="showSecret ? 'text' : 'password'"
                  :append-inner-icon="showSecret ? 'mdi-eye-off' : 'mdi-eye'"
                  prepend-inner-icon="mdi-key-outline"
                  :rules="rules.secret"
                  :error-messages="secretError"
                  hint="Fourni par l’administrateur système"
                  persistent-hint
                  autocomplete="off"
                  class="mb-2"
                  @click:append-inner="showSecret = !showSecret"
                />

                <v-divider class="my-3" />

                <v-text-field
                  v-model="userName"
                  label="Nom d’utilisateur"
                  prepend-inner-icon="mdi-account-outline"
                  :rules="rules.userName"
                  :error-messages="fieldErrors.userName"
                  autocomplete="off"
                />
                <v-text-field
                  v-model="email"
                  label="Email"
                  prepend-inner-icon="mdi-email-outline"
                  :rules="rules.email"
                  :error-messages="fieldErrors.email"
                  autocomplete="off"
                />
                <v-text-field
                  v-model="phone"
                  label="Téléphone (optionnel)"
                  prepend-inner-icon="mdi-phone-outline"
                  :rules="rules.phone"
                  :error-messages="fieldErrors.phone"
                  autocomplete="off"
                />
                <v-text-field
                  v-model="password"
                  label="Mot de passe"
                  :type="showPassword ? 'text' : 'password'"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  prepend-inner-icon="mdi-lock-outline"
                  :rules="rules.password"
                  :error-messages="fieldErrors.password"
                  autocomplete="new-password"
                  @click:append-inner="showPassword = !showPassword"
                />
                <v-text-field
                  v-model="confirmPassword"
                  label="Confirmer le mot de passe"
                  :type="showPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-check-outline"
                  :rules="rules.confirm"
                  autocomplete="new-password"
                />

                <v-alert type="info" variant="tonal" density="compact" class="mt-1 mb-4">
                  Le rôle Administrateur est attribué automatiquement.
                </v-alert>

                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  :loading="submitting"
                  :disabled="!canSubmit"
                  prepend-icon="mdi-shield-check-outline"
                >
                  Créer le compte administrateur
                </v-btn>
              </v-form>

              <div class="text-center mt-4">
                <v-btn variant="text" size="small" @click="router.push({ name: 'login' })">
                  Retour à la connexion
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.bootstrap-screen {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(
      120% 120% at 50% 0%,
      rgba(var(--v-theme-primary), 0.12) 0%,
      rgba(var(--v-theme-primary), 0) 55%
    ),
    rgb(var(--v-theme-background));
}

.bootstrap-theme-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}
</style>
