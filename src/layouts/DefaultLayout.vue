<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { palettes } from '@/theme/palettes'
import { useAttentionStore } from '@/stores/attention'
import { lookupMeta, roleMeta } from '@/constants/status'

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

// Items de navigation principaux — le compteur "À traiter" est branché sur le store.
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
  { title: 'Rapprochement', icon: 'mdi-cash-register', to: { name: 'rapprochement' } },
  { title: 'Messages', icon: 'mdi-message-text-outline', to: { name: 'messages' } },
])

// Groupe WhatsApp — « Configuration » réservé au rôle ADMIN.
const whatsappItems = computed(() => {
  const items = [
    { title: 'Templates', icon: 'mdi-file-document-outline', to: { name: 'whatsapp-templates' } },
  ]
  if (auth.isAdmin) {
    items.push({ title: 'Configuration', icon: 'mdi-tune', to: { name: 'whatsapp-configuration' } })
  }
  return items
})

// Groupe Administration — visible uniquement pour le rôle ADMIN.
const adminItems = computed(() => [
  { title: 'Livreurs', icon: 'mdi-moped-outline', to: { name: 'livreurs' } },
  { title: 'Configuration livraison', icon: 'mdi-map-marker-distance', to: { name: 'livraison-configuration' } },
  { title: 'Utilisateurs', icon: 'mdi-account-multiple-outline', to: { name: 'utilisateurs' } },
])

// Chip de rôle de l'utilisateur connecté (menu 👤).
const roleChip = computed(() => lookupMeta(roleMeta, auth.user?.role))

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  // Badge sidebar : charger les compteurs si la file n'est pas déjà chargée.
  // Sur /a-traiter, ATraiterView a déjà lancé fetchQueue (loading=true) → on saute,
  // sinon on récupère seulement les compteurs sans tirer une page complète.
  const countsAreEmpty = Object.values(attentionStore.counts).every(count => count === 0)
  if (countsAreEmpty && !attentionStore.loading) {
    void attentionStore.fetchCounts()
  }
})
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
      <v-list density="compact" min-width="240">
        <v-list-item :title="auth.user?.userName ?? 'Mon compte'" :subtitle="auth.user?.email ?? 'Connecté'">
          <template #append>
            <v-chip :color="roleChip.color" size="x-small" variant="tonal" :border="`${roleChip.color} sm opacity-50`">
              {{ roleChip.label }}
            </v-chip>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item
          prepend-icon="mdi-account-circle-outline"
          title="Mon profil"
          :to="{ name: 'mon-profil' }"
        />
        <v-list-item
          prepend-icon="mdi-lock-reset"
          title="Changer mon mot de passe"
          :to="{ name: 'mon-profil' }"
        />
        <v-divider />
        <v-list-item prepend-icon="mdi-logout" title="Se déconnecter" @click="logout" />
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

      <v-divider class="my-2" />
      <v-list-subheader v-if="!rail" class="text-uppercase text-caption font-weight-bold">
        WhatsApp
      </v-list-subheader>
      <v-list-item
        v-for="item in whatsappItems"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :aria-label="item.title"
      />

      <template v-if="auth.isAdmin">
        <v-divider class="my-2" />
        <v-list-subheader v-if="!rail" class="text-uppercase text-caption font-weight-bold">
          Administration
        </v-list-subheader>
        <v-list-item
          v-for="item in adminItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :aria-label="item.title"
        />
      </template>
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

</template>
