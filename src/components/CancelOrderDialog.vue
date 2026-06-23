<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  orderName?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [reason: string]
}>()

const reasons = [
  'Client a annulé',
  'Commande en double',
  'Produit indisponible',
  'Coordonnées invalides',
  'Suspicion de commande non fiable',
  'Autre',
]

const reason = ref('')
const comment = ref('')

const commentLimit = computed(() => (reason.value ? 500 - reason.value.length - 3 : 500))
const composedReason = computed(() =>
  comment.value.trim() ? `${reason.value} — ${comment.value.trim()}` : reason.value,
)
const canSubmit = computed(() => Boolean(reason.value) && composedReason.value.length <= 500)

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
        <v-avatar color="error" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-close-circle-outline" />
        </v-avatar>
        Annuler la commande {{ orderName }}
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Choisissez un motif d’annulation. Cette action est définitive.
        </p>
        <v-radio-group v-model="reason" hide-details class="mb-3">
          <v-radio
            v-for="item in reasons"
            :key="item"
            :label="item"
            :value="item"
            density="compact"
          />
        </v-radio-group>
        <v-textarea
          v-model="comment"
          label="Commentaire complémentaire (optionnel)"
          rows="3"
          auto-grow
          counter
          :maxlength="commentLimit"
        />
        <v-alert type="warning" variant="tonal" density="compact">
          Cette commande ne sera plus relancée automatiquement.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Retour</v-btn>
        <v-btn color="error" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Confirmer l’annulation
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
