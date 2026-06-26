<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { palettes } from '@/theme/palettes'
import { toApiFailure } from '@/services/errors'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const successReasons: Record<string, string> = {
  password_changed: 'Mot de passe modifié. Connectez-vous à nouveau.',
  bootstrap_completed: 'Compte administrateur créé. Connectez-vous pour commencer.',
}
const reason = typeof route.query.reason === 'string' ? route.query.reason : ''
const success = ref(successReasons[reason] ?? '')
const error = ref(reason === 'session_expired' ? 'Votre session a expiré, veuillez vous reconnecter.' : '')

const required = (value: string) => Boolean(value.trim()) || 'Ce champ est obligatoire.'

// Bascule clair/sombre : on saute vers la palette claire/sombre par défaut.
const isDark = computed(() => palettes.find((p) => p.key === themeStore.current)?.dark ?? false)
function toggleTheme() {
  const target = palettes.find((p) => p.dark === !isDark.value)
  if (target) themeStore.setPalette(target.key)
}

const safeRedirect = () => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/a-traiter'
}

async function submit() {
  error.value = ''
  success.value = ''
  if (!identifier.value.trim() || !password.value) {
    error.value = 'Renseignez votre identifiant et votre mot de passe.'
    return
  }

  try {
    await auth.login(identifier.value.trim(), password.value)
    await router.push(safeRedirect())
  } catch (cause) {
    const failure = toApiFailure(cause)
    if (failure.code === 'InvalidCredentials') error.value = 'Nom d’utilisateur, email ou mot de passe incorrect.'
    else if (failure.code === 'AccountDisabled') error.value = 'Votre compte a été désactivé. Contactez un administrateur.'
    else error.value = 'Le service est indisponible. Réessayez dans quelques instants.'
  }
}
</script>

<template>
  <div class="login-screen">
    <v-btn
      class="login-theme-toggle"
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      :aria-label="isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
      @click="toggleTheme"
    />

    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="8" md="5" lg="4" xl="3">
          <div class="text-center mb-8">
            <v-avatar color="primary" rounded="lg" size="56" class="mb-3">
              <v-icon icon="mdi-flash" size="32" />
            </v-avatar>
            <h1 class="text-h4 font-weight-bold">
              Assirik <span class="text-medium-emphasis font-weight-medium">Helpdesk</span>
            </h1>
            <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
              Confirmation des commandes COD · Sénégal
            </p>
          </div>

          <v-card border flat rounded="xl" class="pa-2">
            <v-card-item class="pb-2">
              <v-card-title class="text-h6 font-weight-bold">Connexion agent</v-card-title>
              <v-card-subtitle>Connectez-vous pour accéder au helpdesk</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4" role="alert">
                {{ error }}
              </v-alert>
              <v-alert v-if="success" type="success" variant="tonal" density="compact" class="mb-4" role="status">
                {{ success }}
              </v-alert>

              <v-form @submit.prevent="submit">
                <v-text-field
                  v-model="identifier"
                  label="Email ou nom d’utilisateur"
                  prepend-inner-icon="mdi-account-outline"
                  autocomplete="username"
                  :rules="[required]"
                />
                <v-text-field
                  v-model="password"
                  label="Mot de passe"
                  :type="showPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  autocomplete="current-password"
                  :rules="[required]"
                  @click:append-inner="showPassword = !showPassword"
                />
                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  :loading="auth.loading"
                  :disabled="auth.loading"
                  class="mt-2"
                  prepend-icon="mdi-login"
                >
                  Se connecter
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.login-screen {
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

.login-theme-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}
</style>
