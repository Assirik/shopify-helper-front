<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeliveryFeesStore } from '@/stores/deliveryFees'
import { resolveDeliveryFee } from '@/types/deliveryFees'
import type { DeliverOrderPayload, DeliveryChannel } from '@/types/orders'
import { codPaymentStatusMeta } from '@/constants/status'
import { formatAmount } from '@/utils/format'

const props = defineProps<{
  modelValue: boolean
  orderName?: string
  orderTotal?: string | number
  regionCode?: string
  channel?: DeliveryChannel
  currency?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: DeliverOrderPayload]
}>()

const deliveryFeesStore = useDeliveryFeesStore()
const { config } = storeToRefs(deliveryFeesStore)

const collectedAmount = ref('')
const courierFee = ref('')
const note = ref('')

const expectedAmount = computed(() => {
  const value = Number(props.orderTotal)
  return Number.isFinite(value) ? value : 0
})

const collectedValue = computed(() => {
  const value = Number(collectedAmount.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
})
const feeValue = computed(() => {
  const value = Number(courierFee.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
})
const netRemitted = computed(() => collectedValue.value - feeValue.value)

/** Aperçu du statut de paiement (le backend recalcule, ceci n'est qu'indicatif). */
const paymentPreview = computed(() => {
  if (collectedValue.value >= expectedAmount.value && expectedAmount.value > 0) return 'paid'
  if (collectedValue.value > 0) return 'partial'
  return 'unpaid'
})
const paymentMeta = computed(() => codPaymentStatusMeta[paymentPreview.value])

const collectedInvalid = computed(() => collectedAmount.value !== '' && collectedValue.value < 0)
const canSubmit = computed(() => !props.submitting && collectedAmount.value !== '' && !collectedInvalid.value)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    note.value = ''
    collectedAmount.value = String(expectedAmount.value)
    if (props.channel === 'carrier') {
      // Pas de rémunération interne pour un transporteur tiers.
      courierFee.value = '0'
    } else {
      await deliveryFeesStore.ensureLoaded()
      courierFee.value = String(resolveDeliveryFee(config.value, props.regionCode))
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('confirm', {
    collectedAmount: collectedValue.value,
    courierFee: feeValue.value,
    note: note.value.trim() || undefined,
  })
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
        <v-avatar color="success" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-check-circle-outline" />
        </v-avatar>
        Marquer livrée — {{ orderName }}
      </v-card-title>
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 text-medium-emphasis">Montant attendu</span>
          <span class="text-subtitle-1 font-weight-bold">{{ formatAmount(expectedAmount, currency) }}</span>
        </div>

        <v-text-field
          v-model="collectedAmount"
          label="Montant encaissé"
          type="number"
          min="0"
          prepend-inner-icon="mdi-cash"
          :suffix="currency === 'XOF' ? 'FCFA' : currency"
          :error="collectedInvalid"
          :error-messages="collectedInvalid ? 'Montant invalide.' : undefined"
          hide-details="auto"
          class="mb-3"
        />

        <v-text-field
          v-model="courierFee"
          label="Rémunération livreur"
          type="number"
          min="0"
          prepend-inner-icon="mdi-cash-minus"
          :suffix="currency === 'XOF' ? 'FCFA' : currency"
          :hint="channel === 'carrier' ? 'Transporteur tiers : pas de rémunération interne.' : 'Pré-rempli depuis le barème de la région.'"
          persistent-hint
          hide-details="auto"
          class="mb-4"
        />

        <v-sheet
          rounded="lg"
          color="surface-light"
          class="d-flex align-center justify-space-between px-4 py-3 mb-3"
        >
          <div>
            <div class="text-caption text-medium-emphasis">Net reversé en caisse</div>
            <div class="text-h6 font-weight-bold" :class="netRemitted < 0 ? 'text-error' : ''">
              {{ formatAmount(netRemitted, currency) }}
            </div>
          </div>
          <v-chip
            :color="paymentMeta.color"
            variant="tonal"
            size="small"
            :prepend-icon="paymentMeta.icon"
            :border="`${paymentMeta.color} sm opacity-50`"
          >
            {{ paymentMeta.label }}
          </v-chip>
        </v-sheet>

        <v-textarea
          v-model="note"
          label="Note (optionnel)"
          rows="2"
          auto-grow
          counter
          maxlength="500"
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Retour</v-btn>
        <v-btn color="success" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Confirmer la livraison
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
