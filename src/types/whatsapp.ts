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

export interface WhatsappTemplatesResponse {
  data: WhatsappTemplate[]
}

export interface RegionalVariable {
  dakar?: string | null
  nonDakar?: string | null
}

/** Configuration des variables injectées dans les templates. */
export interface MessageVariableConfig {
  shippingNote?: RegionalVariable
  paymentMethod?: RegionalVariable
  updatedBy?: string
  updatedAt?: string
}

export interface MessageConfigResponse {
  data: MessageVariableConfig
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
