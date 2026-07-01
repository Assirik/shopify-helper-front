import api from '@/services/api'
import type {
  DeliveryFeeConfig,
  DeliveryFeeConfigResponse,
  UpdateDeliveryFeeConfigPayload,
} from '@/types/deliveryFees'

export const deliveryFeesService = {
  async get(): Promise<DeliveryFeeConfig> {
    const { data } = await api.get<DeliveryFeeConfigResponse>('/delivery-fees')
    return data.data
  },

  async update(payload: UpdateDeliveryFeeConfigPayload): Promise<DeliveryFeeConfig> {
    const { data } = await api.put<DeliveryFeeConfigResponse>('/delivery-fees', payload)
    return data.data
  },
}
