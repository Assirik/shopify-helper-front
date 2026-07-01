<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Dialog générique de saisie de motif pour les transitions d'exception
 * (échec de livraison, retour). Calqué sur CancelOrderDialog.
 */
const props = defineProps<{
  modelValue: boolean
  title: string
  label: string
  icon?: string
  color?: string
  confirmText?: string
  reasons?: string[]
  orderName?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [reason: string]
}>()

const reason = ref('')
const comment = ref('')

const presets = computed(() => props.reasons ?? [])
const composedReason = computed(() =>
  comment.value.trim() && reason.value
    ? `${reason.value} — ${comment.value.trim()}`
    : reason.value || comment.value.trim(),
)
const canSubmit = computed(
  () => !props.submitting && Boolean(composedReason.value) && composedReason.value.length <= 500,
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reason.value = ''
      comment.value = ''
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('confirm', composedReason.value)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    persistent
    @update:model-value="(value) => { if (!value) close() }"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-3">
        <v-avatar :color="color ?? 'warning'" variant="tonal" rounded="lg" size="40">
          <v-icon :icon="icon ?? 'mdi-alert-circle-outline'" />
        </v-avatar>
        {{ title }}<span v-if="orderName">&nbsp;{{ orderName }}</span>
      </v-card-title>
      <v-card-text>
        <v-radio-group v-if="presets.length" v-model="reason" hide-details class="mb-3">
          <v-radio
            v-for="item in presets"
            :key="item"
            :label="item"
            :value="item"
            density="compact"
          />
        </v-radio-group>
        <v-textarea
          v-model="comment"
          :label="label"
          rows="3"
          auto-grow
          counter
          maxlength="500"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Retour</v-btn>
        <v-btn :color="color ?? 'warning'" :loading="submitting" :disabled="!canSubmit" @click="submit">
          {{ confirmText ?? 'Confirmer' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
