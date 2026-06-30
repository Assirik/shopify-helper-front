import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/premiere-configuration',
      name: 'bootstrap',
      component: () => import('@/views/PremiereConfigurationView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', redirect: { name: 'a-traiter' } },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'a-traiter',
          name: 'a-traiter',
          component: () => import('@/views/ATraiterView.vue'),
        },
        {
          path: 'commandes',
          name: 'commandes',
          component: () => import('@/views/CommandesView.vue'),
        },
        {
          path: 'commandes/:id',
          name: 'commande-detail',
          component: () => import('@/views/CommandeDetailView.vue'),
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/views/ClientsView.vue'),
        },
        {
          path: 'rapprochement',
          name: 'rapprochement',
          component: () => import('@/views/RapprochementView.vue'),
        },
        {
          path: 'livreurs',
          name: 'livreurs',
          component: () => import('@/views/LivreursView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'transporteurs',
          name: 'transporteurs',
          component: () => import('@/views/TransporteursView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'livraison/configuration',
          name: 'livraison-configuration',
          component: () => import('@/views/ConfigurationLivraisonView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/MessagesView.vue'),
        },
        {
          path: 'messages/:id',
          name: 'message-detail',
          component: () => import('@/views/MessageDetailView.vue'),
        },
        {
          path: 'whatsapp/templates',
          name: 'whatsapp-templates',
          component: () => import('@/views/WhatsappTemplatesView.vue'),
        },
        {
          path: 'whatsapp/configuration',
          name: 'whatsapp-configuration',
          component: () => import('@/views/WhatsappConfigView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'utilisateurs',
          name: 'utilisateurs',
          component: () => import('@/views/UtilisateursView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'mon-profil',
          name: 'mon-profil',
          component: () => import('@/views/MonProfilView.vue'),
        },
        {
          path: '403',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ],
})

export const getSafeRedirect = (value: unknown) => {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/a-traiter'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return getSafeRedirect(to.query.redirect)
  }
  // Routes ADMIN-only : on affiche une page 403 explicite (pas de redirection silencieuse).
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'forbidden' }
  }
})

export default router
