import axios from 'axios'

/**
 * Client HTTP unique pour l'API helpdesk.
 * - injecte le JWT depuis le localStorage sur chaque requête
 * - sur 401, purge le token et renvoie vers /login
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const TOKEN_KEY = 'assirik.helpdesk.token'

let unauthorizedHandler: (() => void | Promise<void>) | null = null
let handlingUnauthorized = false

export const setUnauthorizedHandler = (handler: () => void | Promise<void>) => {
  unauthorizedHandler = handler
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler && !handlingUnauthorized) {
      handlingUnauthorized = true
      Promise.resolve(unauthorizedHandler()).finally(() => {
        handlingUnauthorized = false
      })
    }
    return Promise.reject(error)
  },
)

export default api
