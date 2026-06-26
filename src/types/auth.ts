export type UserRole = 'ADMIN' | 'USER' | 'DEVELOPER'

export interface AuthApiUser {
  _id?: string
  id?: string
  userName: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  disabledAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AuthUser {
  id: string
  userName: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  disabledAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface LoginResponse {
  userId: string
  token: string
  user: AuthApiUser
  message: string
}

export interface CurrentUserResponse {
  user: AuthApiUser
}

export const normalizeAuthUser = (user: AuthApiUser): AuthUser => ({
  id: user.id || user._id || '',
  userName: user.userName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive !== false,
  disabledAt: user.disabledAt ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})
