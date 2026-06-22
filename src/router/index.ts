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
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'a-traiter',
          name: 'a-traiter',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'À traiter' },
        },
        {
          path: 'commandes',
          name: 'commandes',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Commandes' },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Clients' },
        },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Messages' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
