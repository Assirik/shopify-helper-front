export type AttentionReason = 'free_text' | 'sms_only' | 'invalid_number' | 'late_confirm'

export type CustomerConfirmationStatus =
  | 'pending'
  | 'confirmed'
  | 'needs_attention'
  | 'expired'
  | 'cancelled'
  | 'sms_only'

export interface ActionCapabilities {
  canConfirm: boolean
  canRemind: boolean
  canCancel: boolean
}

export interface AttentionOrder {
  id: string
  orderName: string
  customerName: string
  customerPhone: string
  region: string
  amount: {
    value: string
    currency: string
  }
  isCashOnDelivery: boolean
  reason: AttentionReason
  lastCustomerMessage: string
  receivedAt: string
  customerConfirmationStatus: CustomerConfirmationStatus
  capabilities: ActionCapabilities
}

export interface AttentionCounts {
  all: number
  free_text: number
  sms_only: number
  invalid_number: number
  late_confirm: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface AttentionQueueResponse {
  data: AttentionOrder[]
  counts: AttentionCounts
  pagination: Pagination
}

export interface BulkOrderFailure {
  orderId: string
  error: string
  status: number
}

export interface BulkOrderResult {
  data: {
    requested: number
    succeeded: Array<{ orderId: string }>
    failed: BulkOrderFailure[]
    summary: {
      succeeded: number
      failed: number
    }
  }
}
