<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Carrier, CreateCarrierPayload, UpdateCarrierPayload } from '@/types/carriers'

const props = defineProps<{
  modelValue: boolean
  carrier?: Carrier | null
  submitting?: boolean
  generalError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: CreateCarrierPayload | UpdateCarrierPayload]
}>()

const name = ref('')
const phone = ref('')
const defaultPrice = ref('')

const isEdit = computed(() => Boolean(props.carrier))
const canSubmit = computed(() => !props.submitting && name.value.trim().length > 0)

const phoneError = computed(() => {
  const value = phone.value.trim()
  if (!value) return undefined
  return /^\+\d{8,15}$/.test(value) ? undefined : 'Format attendu : +221XXXXXXXXX.'
})

const priceError = computed(() => {
  const value = defaultPrice.value.trim()
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? undefined : 'Montant positif ou nul attendu.'
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = props.carrier?.name ?? ''
      phone.value = props.carrier?.phoneE164 ?? ''
      defaultPrice.value = props.carrier?.defaultPrice != null ? String(props.carrier.defaultPrice) : ''
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value || phoneError.value || priceError.value) return
  const trimmedPhone = phone.value.trim()
  const trimmedPrice = defaultPrice.value.trim()
  if (isEdit.value) {
    // `null` efface explicitement téléphone / prix indicatif côté backend.
    emit('submit', {
      name: name.value.trim(),
      phoneE164: trimmedPhone || null,
      defaultPrice: trimmedPrice ? Number(trimmedPrice) : null,
    })
  } else {
    const payload: CreateCarrierPayload = { name: name.value.trim() }
    if (trimmedPhone) payload.phoneE164 = trimmedPhone
    if (trimmedPrice) payload.defaultPrice = Number(trimmedPrice)
    emit('submit', payload)
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    @update:model-value="(value) => { if (!value) close() }"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-3">
        <v-avatar color="info" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-truck-outline" />
        </v-avatar>
        {{ isEdit ? 'Modifier le transporteur' : 'Nouveau transporteur' }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="generalError" type="error" variant="tonal" density="compact" class="mb-3">
          {{ generalError }}
        </v-alert>
        <v-text-field
          v-model="name"
          label="Nom"
          prepend-inner-icon="mdi-truck-delivery-outline"
          autofocus
          hide-details="auto"
          class="mb-3"
          @keyup.enter="submit"
        />
        <v-text-field
          v-model="phone"
          label="Téléphone (optionnel)"
          prepend-inner-icon="mdi-phone-outline"
          placeholder="+221770000000"
          :error-messages="phoneError"
          hide-details="auto"
          class="mb-3"
          @keyup.enter="submit"
        />
        <v-text-field
          v-model="defaultPrice"
          label="Prix indicatif (optionnel)"
          type="number"
          min="0"
          prepend-inner-icon="mdi-cash"
          suffix="FCFA"
          :error-messages="priceError"
          hint="Pré-remplit le coût transporteur à la livraison (modifiable)."
          persistent-hint
          hide-details="auto"
          @keyup.enter="submit"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Annuler</v-btn>
        <v-btn
          color="primary"
          :loading="submitting"
          :disabled="!canSubmit || Boolean(phoneError) || Boolean(priceError)"
          @click="submit"
        >
          {{ isEdit ? 'Enregistrer' : 'Créer' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
