<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toApiFailure } from '@/services/errors'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const success = ref(route.query.reason === 'password_changed' ? 'Mot de passe modifié. Connectez-vous à nouveau.' : '')

const required = (value: string) => Boolean(value.trim()) || 'Ce champ est obligatoire.'

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
    else if (failure.code === 'AccountDisabled') error.value = 'Ce compte a été désactivé. Contactez un administrateur.'
    else error.value = 'Le service est indisponible. Réessayez dans quelques instants.'
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6" elevation="2" rounded="lg">
          <div class="text-center mb-6">
            <v-icon icon="mdi-storefront-outline" size="40" color="primary" />
            <h1 class="text-h5 font-weight-bold mt-2">Assirik Helpdesk</h1>
            <p class="text-body-2 text-medium-emphasis">Connectez-vous pour continuer</p>
          </div>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
            {{ error }}
          </v-alert>
          <v-alert v-if="success" type="success" variant="tonal" density="compact" class="mb-4">
            {{ success }}
          </v-alert>

          <v-form @submit.prevent="submit">
            <v-text-field
              v-model="identifier"
              label="Nom d’utilisateur ou email"
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
            >
              Se connecter
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
