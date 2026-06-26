import type { Pagination } from '@/types/attention'

export type { Pagination }

/** Réponse brute du provider : forme variable selon Meta/Termii. */
export type ProviderResponse = string | Record<string, unknown> | null

export interface MessageFallbackRef {
  id: string
  orderName?: string
  channel?: string
}

/** Élément de la liste des messages (`GET /messages`), enrichi côté backend. */
export interface MessageListItem {
  id: string
  orderId: string
  orderName?: string
  channel: string
  provider: string
  templatePurpose?: string
  templateName?: string
  status: string
  attemptCount?: number
  fallbackOfMessageId?: string
  fallbackOf?: MessageFallbackRef
  createdAt: string
}

/** Détail d'un message (`GET /messages/:id`). */
export interface MessageDetail extends MessageListItem {
  buttonPayload?: string
  providerMessageId?: string
  providerResponse?: ProviderResponse
  errorCode?: string
  errorMessage?: string
}

export interface MessageListResponse {
  data: MessageListItem[]
  pagination: Pagination
}

export interface MessageDetailResponse {
  data: MessageDetail
}
