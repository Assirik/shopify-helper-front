import api from '@/services/api'
import {
  normalizeCourier,
  type Courier,
  type CourierListResponse,
  type CourierResponse,
  type CreateCourierPayload,
  type UpdateCourierPayload,
} from '@/types/couriers'

export const couriersService = {
  async list(): Promise<Courier[]> {
    const { data } = await api.get<CourierListResponse>('/couriers')
    return data.data.map(normalizeCourier)
  },

  async create(payload: CreateCourierPayload): Promise<Courier> {
    const { data } = await api.post<CourierResponse>('/couriers', payload)
    return normalizeCourier(data.data)
  },

  async update(id: string, payload: UpdateCourierPayload): Promise<Courier> {
    const { data } = await api.patch<CourierResponse>(`/couriers/${id}`, payload)
    return normalizeCourier(data.data)
  },

  async setStatus(id: string, isActive: boolean): Promise<Courier> {
    const { data } = await api.patch<CourierResponse>(`/couriers/${id}/status`, { isActive })
    return normalizeCourier(data.data)
  },
}
