/** Transporteur tiers (hors Dakar), `GET /carriers`. */
export interface Carrier {
  id: string
  name: string
  phoneE164?: string
  /** Prix indicatif (non figé) servant de pré-remplissage du coût à la livraison. */
  defaultPrice?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Forme brute renvoyée par le backend (Mongoose `toJSON`, virtual `id`). */
export interface CarrierApi {
  id?: string
  _id?: string
  name: string
  phoneE164?: string
  defaultPrice?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CarrierListResponse {
  data: CarrierApi[]
}

export interface CarrierResponse {
  data: CarrierApi
}

export interface CreateCarrierPayload {
  name: string
  phoneE164?: string
  defaultPrice?: number
}

/** Édition partielle. `null` efface le téléphone / le prix indicatif. */
export interface UpdateCarrierPayload {
  name?: string
  phoneE164?: string | null
  defaultPrice?: number | null
}

export const normalizeCarrier = (carrier: CarrierApi): Carrier => ({
  id: carrier.id || carrier._id || '',
  name: carrier.name,
  phoneE164: carrier.phoneE164,
  defaultPrice: carrier.defaultPrice,
  isActive: carrier.isActive !== false,
  createdAt: carrier.createdAt ?? '',
  updatedAt: carrier.updatedAt ?? '',
})
