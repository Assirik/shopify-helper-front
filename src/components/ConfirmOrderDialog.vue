<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminConfirmationSource } from '@/types/orders'

/**
 * Confirmation manuelle d'une commande : l'agent indique comment le client a
 * confirmé (Lot 0 · F15). « Par appel » est présélectionné : c'est le cas courant.
 */
const props = defineProps<{
  modelValue: boolean
  orderName?: string
  submitting?: boolean
  /**
   * Confirmation réservée à l'appel (commande « Numéro différent ») : pas de choix de source,
   * l'agent confirme seulement après avoir appelé le client au numéro de la commande.
   */
  callOnly?: boolean
  /** Numéro de la commande, affiché en mode `callOnly`. */
  orderPhone?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [source: AdminConfirmationSource]
}>()

const source = ref<AdminConfirmationSource>('phone_call')

watch(
  () => props.modelValue,
  (open) => {
    if (open) source.value = 'phone_call'
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (props.submitting) return
  emit('confirm', props.callOnly ? 'phone_call' : source.value)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="(value) => { if (!value) close() }"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-3">
        <v-avatar color="success" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-check-circle-outline" />
        </v-avatar>
        Confirmer la commande {{ orderName }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="callOnly" type="warning" variant="tonal" density="compact" class="mb-3">
          Le message vient d’un autre numéro que celui de la commande.
          <template v-if="orderPhone">Appelez le client au <strong>{{ orderPhone }}</strong></template>
          <template v-else>Appelez le client (le numéro de la commande est absent)</template>
          et confirmez seulement s’il valide la commande par téléphone.
        </v-alert>
        <p v-if="callOnly" class="text-body-2 d-flex align-center ga-2 mb-3">
          <v-icon icon="mdi-phone-outline" size="18" />
          Confirmation par appel téléphonique
        </p>
        <p v-else class="text-body-2 text-medium-emphasis mb-3">Comment le client a-t-il confirmé ?</p>
        <v-radio-group v-if="!callOnly" v-model="source" hide-details>
          <v-radio value="phone_call" density="compact">
            <template #label>
              <span class="d-inline-flex align-center ga-2">
                <v-icon icon="mdi-phone-outline" size="18" />
                Par appel téléphonique
              </span>
            </template>
          </v-radio>
          <v-radio value="admin" density="compact">
            <template #label>
              <span class="d-inline-flex align-center ga-2">
                <v-icon icon="mdi-account-check-outline" size="18" />
                Autrement (message, en personne…)
              </span>
            </template>
          </v-radio>
        </v-radio-group>
        <v-alert type="info" variant="tonal" density="compact" class="mt-4">
          Le client reçoit le message WhatsApp de confirmation.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Retour</v-btn>
        <v-btn color="success" :loading="submitting" @click="submit">Confirmer la commande</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
