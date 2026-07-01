<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Courier, CreateCourierPayload, UpdateCourierPayload } from '@/types/couriers'

const props = defineProps<{
  modelValue: boolean
  courier?: Courier | null
  submitting?: boolean
  generalError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: CreateCourierPayload | UpdateCourierPayload]
}>()

const name = ref('')
const phone = ref('')

const isEdit = computed(() => Boolean(props.courier))
const canSubmit = computed(() => !props.submitting && name.value.trim().length > 0)

// Validation locale du numéro E.164 (cohérent avec le reste du helpdesk).
const phoneError = computed(() => {
  const value = phone.value.trim()
  if (!value) return undefined
  return /^\+\d{8,15}$/.test(value) ? undefined : 'Format attendu : +221XXXXXXXXX.'
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = props.courier?.name ?? ''
      phone.value = props.courier?.phoneE164 ?? ''
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value || phoneError.value) return
  const trimmedPhone = phone.value.trim()
  if (isEdit.value) {
    // `null` efface explicitement le téléphone côté backend.
    emit('submit', { name: name.value.trim(), phoneE164: trimmedPhone || null })
  } else {
    const payload: CreateCourierPayload = { name: name.value.trim() }
    if (trimmedPhone) payload.phoneE164 = trimmedPhone
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
        <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-moped-outline" />
        </v-avatar>
        {{ isEdit ? 'Modifier le livreur' : 'Nouveau livreur' }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="generalError" type="error" variant="tonal" density="compact" class="mb-3">
          {{ generalError }}
        </v-alert>
        <v-text-field
          v-model="name"
          label="Nom complet"
          prepend-inner-icon="mdi-account-outline"
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
          @keyup.enter="submit"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!canSubmit || Boolean(phoneError)" @click="submit">
          {{ isEdit ? 'Enregistrer' : 'Créer' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
