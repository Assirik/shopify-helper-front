/** Livreur interne (`GET /couriers`). */
export interface Courier {
  id: string
  name: string
  phoneE164?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Forme brute renvoyée par le backend (Mongoose `toJSON`, virtual `id`). */
export interface CourierApi {
  id?: string
  _id?: string
  name: string
  phoneE164?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CourierListResponse {
  data: CourierApi[]
}

export interface CourierResponse {
  data: CourierApi
}

export interface CreateCourierPayload {
  name: string
  phoneE164?: string
}

/** Édition partielle d'un livreur. `null` efface le téléphone. */
export interface UpdateCourierPayload {
  name?: string
  phoneE164?: string | null
}

export const normalizeCourier = (courier: CourierApi): Courier => ({
  id: courier.id || courier._id || '',
  name: courier.name,
  phoneE164: courier.phoneE164,
  isActive: courier.isActive !== false,
  createdAt: courier.createdAt ?? '',
  updatedAt: courier.updatedAt ?? '',
})
