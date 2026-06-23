import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setUnauthorizedHandler } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

setUnauthorizedHandler(async () => {
  const auth = useAuthStore(pinia)
  const currentRoute = router.currentRoute.value
  auth.clearSession()

  if (auth.initialized && currentRoute.name !== 'login') {
    await router.replace({
      name: 'login',
      query: { redirect: currentRoute.fullPath },
    })
  }
})

app.mount('#app')
