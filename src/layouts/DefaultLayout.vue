<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { palettes } from '@/theme/palettes'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()

// Sidebar repliable (rail = mode icônes seules)
const rail = ref(false)

// Items de navigation — le compteur "À traiter" sera branché sur l'API plus tard.
const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: { name: 'dashboard' } },
  { title: 'À traiter', icon: 'mdi-alert-circle-outline', to: { name: 'a-traiter' }, badge: 0 },
  { title: 'Commandes', icon: 'mdi-cart-outline', to: { name: 'commandes' } },
  { title: 'Clients', icon: 'mdi-account-group-outline', to: { name: 'clients' } },
  { title: 'Messages', icon: 'mdi-message-text-outline', to: { name: 'messages' } },
]

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <v-navigation-drawer :rail="rail" permanent>
    <v-list-item
      :prepend-avatar="undefined"
      prepend-icon="mdi-storefront-outline"
      title="Assirik"
      subtitle="Helpdesk"
      nav
    />
    <v-divider />

    <v-list density="comfortable" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
      >
        <template v-if="item.badge" #append>
          <v-badge color="error" :content="item.badge" inline />
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-app-bar flat border>
    <v-app-bar-nav-icon icon="mdi-menu" @click="rail = !rail" />
    <v-app-bar-title>Assirik Helpdesk</v-app-bar-title>

    <v-spacer />

    <!-- Recherche globale (placeholder, non branchée) -->
    <v-responsive max-width="320" class="mr-2 d-none d-sm-flex">
      <v-text-field
        density="compact"
        variant="solo-filled"
        flat
        hide-details
        rounded
        placeholder="Rechercher (commande, téléphone, client)…"
        prepend-inner-icon="mdi-magnify"
      />
    </v-responsive>

    <!-- Menu rapide : palettes -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn icon="mdi-palette-outline" variant="text" v-bind="props" />
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

    <!-- Menu utilisateur -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn icon="mdi-account-circle-outline" variant="text" v-bind="props" />
      </template>
      <v-list density="compact">
        <v-list-item :subtitle="auth.user?.email ?? 'Connecté'" title="Mon compte" />
        <v-divider />
        <v-list-item prepend-icon="mdi-logout" title="Déconnexion" @click="logout" />
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <router-view />
    </v-container>
  </v-main>
</template>
