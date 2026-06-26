<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UserRole } from '@/types/auth'
import type { AdminUser, CreateUserPayload, UpdateUserPayload, ValidationDetails } from '@/types/users'
import { roleMeta } from '@/constants/status'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** `null` ⇒ création ; sinon édition de cet utilisateur. */
    user?: AdminUser | null
    /** Vrai si l'utilisateur édité est l'utilisateur connecté (garde-fou rôle). */
    isSelf?: boolean
    submitting?: boolean
    fieldErrors?: ValidationDetails
    generalError?: string
  }>(),
  { user: null, isSelf: false, submitting: false, fieldErrors: () => ({}), generalError: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: CreateUserPayload | UpdateUserPayload]
}>()

const isEdit = computed(() => Boolean(props.user))
const title = computed(() =>
  isEdit.value ? `Modifier ${props.user?.userName}` : 'Nouvel utilisateur',
)

const roleOptions: Array<{ value: UserRole; title: string }> = [
  { value: 'ADMIN', title: roleMeta.ADMIN.label },
  { value: 'USER', title: roleMeta.USER.label },
  { value: 'DEVELOPER', title: roleMeta.DEVELOPER.label },
]

const userName = ref('')
const email = ref('')
const phone = ref('')
const role = ref<UserRole>('USER')
const password = ref('')
const showPassword = ref(false)
const formValid = ref(false)

const byteLength = (value: string) => new TextEncoder().encode(value).length

const rules = {
  userName: [
    (v: string) => Boolean(v?.trim()) || 'Le nom d’utilisateur est obligatoire.',
    (v: string) => /^[a-zA-Z0-9._-]{3,50}$/.test(v) || '3 à 50 caractères : lettres, chiffres, . _ -',
  ],
  email: [
    (v: string) => Boolean(v?.trim()) || 'L’email est obligatoire.',
    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Format d’email invalide.',
    (v: string) => v.length <= 254 || 'L’email est trop long (254 caractères max).',
  ],
  phone: [
    (v: string) => !v || (v.length >= 1 && v.length <= 30) || 'Le téléphone doit faire 1 à 30 caractères.',
  ],
  password: [
    (v: string) => Boolean(v) || 'Le mot de passe est obligatoire.',
    (v: string) => {
      const len = byteLength(v)
      return (len >= 8 && len <= 72) || 'Le mot de passe doit contenir entre 8 et 72 octets.'
    },
  ],
}

function syncFromProps() {
  userName.value = props.user?.userName ?? ''
  email.value = props.user?.email ?? ''
  phone.value = props.user?.phone ?? ''
  role.value = props.user?.role ?? 'USER'
  password.value = ''
  showPassword.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) syncFromProps()
  },
)

// Garde-fou UI : pas de modification de son propre rôle.
const roleDisabled = computed(() => isEdit.value && props.isSelf)

// En édition, le bouton reste désactivé tant que rien n'a changé.
const hasChanges = computed(() => {
  if (!isEdit.value || !props.user) return true
  return (
    userName.value !== props.user.userName ||
    email.value !== props.user.email ||
    (phone.value || '') !== (props.user.phone || '') ||
    role.value !== props.user.role
  )
})

const canSubmit = computed(() => formValid.value && hasChanges.value && !props.submitting)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  const trimmedPhone = phone.value.trim()
  if (isEdit.value) {
    const payload: UpdateUserPayload = {
      userName: userName.value.trim(),
      email: email.value.trim(),
      phone: trimmedPhone || null, // null (pas undefined) pour permettre l'effacement
    }
    if (!roleDisabled.value) payload.role = role.value
    emit('submit', payload)
  } else {
    const payload: CreateUserPayload = {
      userName: userName.value.trim(),
      email: email.value.trim(),
      phone: trimmedPhone || undefined,
      role: role.value,
      password: password.value,
    }
    emit('submit', payload)
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="(value) => { if (!value) close() }"
  >
    <v-card :title="title">
      <v-card-text>
        <v-alert v-if="generalError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ generalError }}
        </v-alert>

        <v-form v-model="formValid" @submit.prevent="submit">
          <v-text-field
            v-model="userName"
            label="Nom d’utilisateur"
            prepend-inner-icon="mdi-account-outline"
            :rules="rules.userName"
            :error-messages="fieldErrors.userName"
            autocomplete="off"
          />
          <v-text-field
            v-model="email"
            label="Email"
            prepend-inner-icon="mdi-email-outline"
            :rules="rules.email"
            :error-messages="fieldErrors.email"
            autocomplete="off"
          />
          <v-text-field
            v-model="phone"
            label="Téléphone (optionnel)"
            prepend-inner-icon="mdi-phone-outline"
            :rules="rules.phone"
            :error-messages="fieldErrors.phone"
            autocomplete="off"
          />

          <v-tooltip
            :disabled="!roleDisabled"
            text="Vous ne pouvez pas modifier votre propre rôle."
            location="top"
          >
            <template #activator="{ props: tip }">
              <div v-bind="tip">
                <v-select
                  v-model="role"
                  label="Rôle"
                  prepend-inner-icon="mdi-shield-account-outline"
                  :items="roleOptions"
                  :disabled="roleDisabled"
                  :error-messages="fieldErrors.role"
                />
              </div>
            </template>
          </v-tooltip>

          <v-text-field
            v-if="!isEdit"
            v-model="password"
            label="Mot de passe"
            prepend-inner-icon="mdi-lock-outline"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="rules.password"
            :error-messages="fieldErrors.password"
            autocomplete="new-password"
            hint="8 caractères minimum."
            persistent-hint
            @click:append-inner="showPassword = !showPassword"
          />
          <p v-else class="text-caption text-medium-emphasis mt-1">
            Le mot de passe se réinitialise depuis l’action « Réinitialiser le mot de passe ».
          </p>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
