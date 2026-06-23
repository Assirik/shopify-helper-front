import api from '@/services/api'
import type { CustomerListResponse } from '@/types/customers'

export interface CustomerListParams {
  page?: number
  limit?: number
  search?: string
  phone?: string
  email?: string
}

export const customersService = {
  async list(params: CustomerListParams) {
    const { data } = await api.get<CustomerListResponse>('/customers', { params })
    return data
  },
}
