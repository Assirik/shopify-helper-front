import api from '@/services/api'
import {
  normalizeCarrier,
  type Carrier,
  type CarrierListResponse,
  type CarrierResponse,
  type CreateCarrierPayload,
  type UpdateCarrierPayload,
} from '@/types/carriers'

export const carriersService = {
  async list(): Promise<Carrier[]> {
    const { data } = await api.get<CarrierListResponse>('/carriers')
    return data.data.map(normalizeCarrier)
  },

  async create(payload: CreateCarrierPayload): Promise<Carrier> {
    const { data } = await api.post<CarrierResponse>('/carriers', payload)
    return normalizeCarrier(data.data)
  },

  async update(id: string, payload: UpdateCarrierPayload): Promise<Carrier> {
    const { data } = await api.patch<CarrierResponse>(`/carriers/${id}`, payload)
    return normalizeCarrier(data.data)
  },

  async setStatus(id: string, isActive: boolean): Promise<Carrier> {
    const { data } = await api.patch<CarrierResponse>(`/carriers/${id}/status`, { isActive })
    return normalizeCarrier(data.data)
  },
}
