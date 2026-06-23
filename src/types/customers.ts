import type { Pagination } from '@/types/attention'

export type { Pagination }

/** Modèle Client (`Customer`) tel qu'affiché dans la liste. */
export interface CustomerListItem {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  phoneE164?: string
  email?: string
  city?: string
  region?: string
  country?: string
  orderCount?: number
  lastOrderName?: string
  lastOrderAt?: string
}

export interface CustomerListResponse {
  data: CustomerListItem[]
  pagination: Pagination
}
