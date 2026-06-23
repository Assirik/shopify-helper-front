<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { palettes } from '@/theme/palettes'
import { toApiFailure } from '@/services/errors'
import { useAttentionStore } from '@/stores/attention'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()
const attentionStore = useAttentionStore()

// Bascule clair/sombre : on saute vers la palette claire/sombre par défaut.
const isDark = computed(() => palettes.find((p) => p.key === themeStore.current)?.dark ?? false)
function toggleTheme() {
  const target = palettes.find((p) => p.dark === !isDark.value)
  if (target) themeStore.setPalette(target.key)
}

const userInitials = computed(() => {
  const name = auth.user?.userName ?? ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AS'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
})

// Sidebar repliable (rail = mode icônes seules)
const rail = ref(false)
const passwordDialog = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const passwordError = ref('')

// Items de navigation — le compteur "À traiter" sera branché sur l'API plus tard.
const navItems = computed(() => [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: { name: 'dashboard' } },
  {
    title: 'À traiter',
    icon: 'mdi-alert-circle-outline',
    to: { name: 'a-traiter' },
    badge: attentionStore.counts.all,
  },
  { title: 'Commandes', icon: 'mdi-cart-outline', to: { name: 'commandes' } },
  { title: 'Clients', icon: 'mdi-account-group-outline', to: { name: 'clients' } },
  { title: 'Messages', icon: 'mdi-message-text-outline', to: { name: 'messages' } },
])

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

const passwordRule = (value: string) => {
  const length = new TextEncoder().encode(value).length
  return (length >= 8 && length <= 72) || 'Le mot de passe doit contenir entre 8 et 72 octets.'
}

function resetPasswordDialog() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  passwordError.value = ''
}

function closePasswordDialog() {
  passwordDialog.value = false
  resetPasswordDialog()
}

async function submitPasswordChange() {
  passwordError.value = ''
  if (!currentPassword.value || passwordRule(newPassword.value) !== true) {
    passwordError.value = 'Vérifiez les mots de passe renseignés.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'La confirmation ne correspond pas au nouveau mot de passe.'
    return
  }

  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    closePasswordDialog()
    auth.logout()
    await router.push({ name: 'login', query: { reason: 'password_changed' } })
  } catch (cause) {
    const failure = toApiFailure(cause)
    passwordError.value = failure.code === 'BadPassword'
      ? 'Le mot de passe actuel est incorrect.'
      : 'Le mot de passe n’a pas pu être modifié.'
  }
}
</script>

<template>
  <v-app-bar flat border>
    <v-app-bar-nav-icon icon="mdi-menu" @click="rail = !rail" />
    <div class="d-flex align-center ga-2 mr-2">
      <v-avatar color="primary" rounded="lg" size="30">
        <v-icon icon="mdi-flash" size="20" />
      </v-avatar>
      <span class="text-subtitle-1 font-weight-bold">
        Assirik <span class="text-medium-emphasis font-weight-medium">Helpdesk</span>
      </span>
    </div>

    <v-spacer />

    <!-- Recherche globale (placeholder, non branchée) -->
    <v-responsive max-width="550" class="mr-2 d-none d-sm-flex">
      <v-text-field
        density="comfortable"
        flat
        hide-details
        variant="outlined"
        bg-color="grey-lighten-3"
        color="text-secondary"
        glow
        placeholder="Rechercher (commande, téléphone, client)…"
        prepend-inner-icon="mdi-magnify"
      />
    </v-responsive>

    <v-spacer/>

    <!-- Menu rapide : palettes -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn icon="mdi-palette-outline" variant="text" aria-label="Choisir une palette" v-bind="props" />
      </template>
      <v-list density="compact">
        <v-list-subheader>Palette</v-list-subheader>
        <v-list-item
          v-for="p in palettes"
          :key="p.key"
          :active="themeStore.current === p.key"
          @click="themeStore.setPalette(p.key)"
        >
          <template #prepend>
            <v-icon :icon="p.dark ? 'mdi-weather-night' : 'mdi-white-balance-sunny'" />
          </template>
          <v-list-item-title>{{ p.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Bascule clair / sombre -->
    <v-btn
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      :aria-label="isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
      @click="toggleTheme"
    />

    <!-- Menu utilisateur -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn
          variant="text"
          rounded="pill"
          class="text-none px-2"
          aria-label="Ouvrir le menu utilisateur"
          v-bind="props"
        >
          <v-avatar color="secondary" size="32" class="mr-2">
            <span class="text-caption font-weight-bold">{{ userInitials }}</span>
          </v-avatar>
          <span class="d-none d-sm-inline text-body-2 font-weight-medium">{{ auth.user?.userName ?? 'Mon compte' }}</span>
          <v-icon icon="mdi-chevron-down" size="18" class="text-medium-emphasis ml-1 d-none d-sm-inline" />
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          :title="auth.user?.userName ?? 'Mon compte'"
          :subtitle="auth.user ? `${auth.user.email} · ${auth.user.role}` : 'Connecté'"
        />
        <v-list-item
          prepend-icon="mdi-lock-reset"
          title="Changer mon mot de passe"
          @click="passwordDialog = true"
        />
        <v-divider />
        <v-list-item prepend-icon="mdi-logout" title="Déconnexion" @click="logout" />
      </v-list>
    </v-menu>
  </v-app-bar>
  <v-navigation-drawer :rail="rail" permanent>
    <v-list density="comfortable" nav class="mt-2">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :aria-label="item.title"
      >
        <template v-if="item.badge" #append>
          <v-badge color="error" :content="item.badge" inline />
        </template>
      </v-list-item>
    </v-list>

    <template #append>
      <div v-if="!rail" class="px-4 py-3 text-caption text-medium-emphasis border-t-thin">
        Confirmation COD · Sénégal
      </div>
    </template>
  </v-navigation-drawer>

  <v-main>
    <v-container fluid class="pa-6">
      <router-view />
    </v-container>
  </v-main>

  <v-dialog v-model="passwordDialog" max-width="480" persistent>
    <v-card title="Changer mon mot de passe">
      <v-card-text>
        <v-alert v-if="passwordError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ passwordError }}
        </v-alert>
        <v-text-field
          v-model="currentPassword"
          label="Mot de passe actuel"
          :type="showCurrentPassword ? 'text' : 'password'"
          :append-inner-icon="showCurrentPassword ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="current-password"
          @click:append-inner="showCurrentPassword = !showCurrentPassword"
        />
        <v-text-field
          v-model="newPassword"
          label="Nouveau mot de passe"
          :type="showNewPassword ? 'text' : 'password'"
          :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="new-password"
          :rules="[passwordRule]"
          @click:append-inner="showNewPassword = !showNewPassword"
        />
        <v-text-field
          v-model="confirmPassword"
          label="Confirmer le nouveau mot de passe"
          :type="showNewPassword ? 'text' : 'password'"
          autocomplete="new-password"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="auth.loading" @click="closePasswordDialog">Retour</v-btn>
        <v-btn color="primary" :loading="auth.loading" @click="submitPasswordChange">Modifier</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
