import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { whatsappService } from '@/services/whatsapp.service'
import { toApiFailure } from '@/services/errors'
import {
  CONFIG_FIELD_KEYS,
  CONFIG_MAX_LENGTH,
  type ConfigFieldKey,
  type InvalidMessageConfigError,
  type MessageVariableConfig,
} from '@/types/whatsapp'

type FieldValues = Record<ConfigFieldKey, string>

const emptyFields = (): FieldValues => ({
  'shippingNote.dakar': '',
  'shippingNote.nonDakar': '',
  'paymentMethod.dakar': '',
  'paymentMethod.nonDakar': '',
})

const emptyErrors = (): Partial<Record<ConfigFieldKey, string>> => ({})

const fromConfig = (config: MessageVariableConfig): FieldValues => ({
  'shippingNote.dakar': config.shippingNote?.dakar ?? '',
  'shippingNote.nonDakar': config.shippingNote?.nonDakar ?? '',
  'paymentMethod.dakar': config.paymentMethod?.dakar ?? '',
  'paymentMethod.nonDakar': config.paymentMethod?.nonDakar ?? '',
})

const toConfigPayload = (fields: FieldValues): MessageVariableConfig => {
  const toValue = (raw: string): string | null => {
    const trimmed = raw.trim()
    return trimmed ? trimmed : null
  }
  return {
    shippingNote: {
      dakar: toValue(fields['shippingNote.dakar']),
      nonDakar: toValue(fields['shippingNote.nonDakar']),
    },
    paymentMethod: {
      dakar: toValue(fields['paymentMethod.dakar']),
      nonDakar: toValue(fields['paymentMethod.nonDakar']),
    },
  }
}

/** Validation locale alignée sur les règles backend (contrat §1.8). */
export function validateConfigField(value: string): string | null {
  if (!value) return null
  if (/[\n\r\t]/.test(value)) return 'Pas de saut de ligne ni de tabulation.'
  if (/ {5,}/.test(value)) return 'Pas plus de 4 espaces consécutifs.'
  if (value.length > CONFIG_MAX_LENGTH) return `Maximum ${CONFIG_MAX_LENGTH} caractères (${value.length}).`
  return null
}

function isInvalidConfigError(error: unknown): error is { response: { data: InvalidMessageConfigError } } {
  return (
    axios.isAxiosError(error) &&
    error.response?.data?.error === 'InvalidMessageVariableConfig' &&
    typeof error.response?.data?.details === 'object'
  )
}

export const useWhatsappConfigStore = defineStore('whatsappConfig', () => {
  const fields = reactive<FieldValues>(emptyFields())
  const baseline = reactive<FieldValues>(emptyFields())
  const serverErrors = reactive<Partial<Record<ConfigFieldKey, string>>>(emptyErrors())
  const updatedBy = ref<string | null>(null)
  const updatedAt = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const loadErrorCode = ref('')

  const localErrors = computed<Partial<Record<ConfigFieldKey, string>>>(() => {
    const map: Partial<Record<ConfigFieldKey, string>> = {}
    CONFIG_FIELD_KEYS.forEach(key => {
      const error = validateConfigField(fields[key])
      if (error) map[key] = error
    })
    return map
  })

  /** Erreur effective par champ : locale prioritaire, sinon erreur serveur. */
  const errors = computed<Partial<Record<ConfigFieldKey, string>>>(() => {
    const map: Partial<Record<ConfigFieldKey, string>> = {}
    CONFIG_FIELD_KEYS.forEach(key => {
      const error = localErrors.value[key] ?? serverErrors[key]
      if (error) map[key] = error
    })
    return map
  })

  const errorCount = computed(() => Object.keys(errors.value).length)
  const dirty = computed(() => CONFIG_FIELD_KEYS.some(key => fields[key] !== baseline[key]))
  const canSave = computed(() => dirty.value && errorCount.value === 0)

  function applyConfig(config: MessageVariableConfig) {
    const values = fromConfig(config)
    Object.assign(fields, values)
    Object.assign(baseline, values)
    Object.assign(serverErrors, emptyErrors())
    CONFIG_FIELD_KEYS.forEach(key => delete serverErrors[key])
    updatedBy.value = config.updatedBy ?? null
    updatedAt.value = config.updatedAt ?? null
  }

  function setField(key: ConfigFieldKey, value: string) {
    fields[key] = value
    delete serverErrors[key]
  }

  function resetField(key: ConfigFieldKey) {
    fields[key] = ''
    delete serverErrors[key]
  }

  function discardChanges() {
    CONFIG_FIELD_KEYS.forEach(key => {
      fields[key] = baseline[key]
      delete serverErrors[key]
    })
  }

  async function fetchConfig() {
    loading.value = true
    loadErrorCode.value = ''
    try {
      const response = await whatsappService.getConfig()
      applyConfig(response.data ?? { shippingNote: {}, paymentMethod: {} })
    } catch (cause) {
      loadErrorCode.value = toApiFailure(cause).code
    } finally {
      loading.value = false
    }
  }

  async function save() {
    if (!canSave.value) return false
    saving.value = true
    CONFIG_FIELD_KEYS.forEach(key => delete serverErrors[key])
    try {
      const response = await whatsappService.updateConfig(toConfigPayload(fields))
      applyConfig(response.data ?? { shippingNote: {}, paymentMethod: {} })
      return true
    } catch (cause) {
      if (isInvalidConfigError(cause)) {
        const { details } = cause.response.data
        Object.entries(details).forEach(([key, message]) => {
          if ((CONFIG_FIELD_KEYS as string[]).includes(key)) {
            serverErrors[key as ConfigFieldKey] = message
          }
        })
      }
      throw cause
    } finally {
      saving.value = false
    }
  }

  return {
    fields,
    baseline,
    updatedBy,
    updatedAt,
    loading,
    saving,
    loadErrorCode,
    localErrors,
    errors,
    errorCount,
    dirty,
    canSave,
    fetchConfig,
    setField,
    resetField,
    discardChanges,
    save,
  }
})
