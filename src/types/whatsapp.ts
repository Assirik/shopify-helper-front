import type { UpdatedByUser } from '@/types/users'

export interface WhatsappTemplateButton {
  type?: string
  text: string
}

/** Template Meta du catalogue WhatsApp (lecture seule). */
export interface WhatsappTemplate {
  id?: string
  name: string
  language?: string
  category?: string
  status: string
  body?: string
  variables?: string[]
  buttons?: WhatsappTemplateButton[]
}

export interface MetaTemplateButton {
  type?: string
  text?: string
}

export interface MetaTemplateComponent {
  type?: string
  text?: string
  buttons?: MetaTemplateButton[]
}

export interface MetaTemplate {
  id?: string
  name?: string
  language?: string
  category?: string
  status?: string
  components?: MetaTemplateComponent[]
}

export interface WhatsappTemplatesResponse {
  data: {
    data?: MetaTemplate[]
    paging?: unknown
  }
}

export interface RegionalVariable {
  dakar?: string | null
  nonDakar?: string | null
}

/** Configuration des variables injectées dans les templates. */
export interface MessageVariableConfig {
  shippingNote?: RegionalVariable
  paymentMethod?: RegionalVariable
  /** Peuplé par le backend ; `string` = ObjectId brut d'anciennes réponses. */
  updatedBy?: UpdatedByUser | string | null
  updatedAt?: string
}

export interface MessageConfigResponse {
  data: MessageVariableConfig | null
}

/** Erreur 400 de validation côté backend. */
export interface InvalidMessageConfigError {
  error: 'InvalidMessageVariableConfig'
  details: Record<string, string>
}

/** Clés de champ éditables, en notation plate pour le mapping d'erreurs. */
export type ConfigFieldKey =
  | 'shippingNote.dakar'
  | 'shippingNote.nonDakar'
  | 'paymentMethod.dakar'
  | 'paymentMethod.nonDakar'

export const CONFIG_FIELD_KEYS: ConfigFieldKey[] = [
  'shippingNote.dakar',
  'shippingNote.nonDakar',
  'paymentMethod.dakar',
  'paymentMethod.nonDakar',
]

export const CONFIG_MAX_LENGTH = 200
