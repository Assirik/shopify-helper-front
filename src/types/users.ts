import type { AuthApiUser, UserRole } from '@/types/auth'
import type { Pagination } from '@/types/attention'

/**
 * Utilisateur « safe » renvoyé par l'API d'administration (`/auth/users…`).
 * Jamais de `password` / `sessionVersion` / `bootstrapKey` : le backend les retire
 * via `toSafeUser`, on ne les réintroduit pas.
 */
export interface AdminUser {
  id: string
  userName: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  disabledAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UserListParams {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  /** L'API attend la chaîne `'true'` / `'false'`. */
  active?: 'true' | 'false'
}

export interface UserListResponse {
  data: AdminUser[]
  pagination: Pagination
}

export interface CreateUserPayload {
  userName: string
  email: string
  phone?: string
  role?: UserRole
  password: string
}

/** Édition partielle — jamais de `password` (le reset passe par un endpoint dédié). */
export interface UpdateUserPayload {
  userName?: string
  email?: string
  /** `null` efface explicitement le téléphone (clé présente côté backend). */
  phone?: string | null
  role?: UserRole
}

export interface BootstrapPayload {
  userName: string
  email: string
  phone?: string
  password: string
}

/** `400 ValidationFailed.details` : map champ → message backend. */
export type ValidationDetails = Record<string, string>

export const normalizeAdminUser = (user: AuthApiUser): AdminUser => ({
  id: user.id || user._id || '',
  userName: user.userName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive !== false,
  disabledAt: user.disabledAt ?? null,
  createdAt: user.createdAt ?? '',
  updatedAt: user.updatedAt ?? '',
})
