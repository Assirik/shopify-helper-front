<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    userName?: string
    submitting?: boolean
    generalError?: string
  }>(),
  { userName: '', submitting: false, generalError: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [password: string]
}>()

const password = ref('')
const showPassword = ref(false)
const formValid = ref(false)

const byteLength = (value: string) => new TextEncoder().encode(value).length

const rules = [
  (v: string) => Boolean(v) || 'Le mot de passe est obligatoire.',
  (v: string) => {
    const len = byteLength(v)
    return (len >= 8 && len <= 72) || 'Le mot de passe doit contenir entre 8 et 72 octets.'
  },
]

// Indicateur de robustesse simple (longueur + diversité de caractères).
const strength = computed(() => {
  const v = password.value
  if (!v) return { value: 0, label: '', color: 'neutral' }
  let score = 0
  if (byteLength(v) >= 8) score++
  if (byteLength(v) >= 12) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++
  const levels = [
    { value: 25, label: 'Faible', color: 'error' },
    { value: 50, label: 'Moyen', color: 'warning' },
    { value: 75, label: 'Bon', color: 'info' },
    { value: 100, label: 'Fort', color: 'success' },
  ]
  return levels[Math.min(score, 4) - 1] ?? levels[0]
})

const canSubmit = computed(() => formValid.value && !props.submitting)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      password.value = ''
      showPassword.value = false
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', password.value)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    @update:model-value="(value) => { if (!value) close() }"
  >
    <v-card :title="`Réinitialiser le mot de passe de ${userName}`">
      <v-card-text>
        <v-alert v-if="generalError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ generalError }}
        </v-alert>

        <v-form v-model="formValid" @submit.prevent="submit">
          <v-text-field
            v-model="password"
            label="Nouveau mot de passe"
            prepend-inner-icon="mdi-lock-outline"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="rules"
            autocomplete="new-password"
            @click:append-inner="showPassword = !showPassword"
          />
          <div v-if="password" class="mb-2">
            <v-progress-linear
              :model-value="strength.value"
              :color="strength.color"
              height="6"
              rounded
            />
            <span class="text-caption" :class="`text-${strength.color}`">{{ strength.label }}</span>
          </div>
        </v-form>

        <v-alert type="info" variant="tonal" density="compact" class="mt-2">
          L’utilisateur sera déconnecté de ses sessions actives.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Réinitialiser
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
