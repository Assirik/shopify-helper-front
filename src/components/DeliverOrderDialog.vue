<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeliveryFeesStore } from '@/stores/deliveryFees'
import { useCarriersStore } from '@/stores/carriers'
import { resolveDeliveryFee } from '@/types/deliveryFees'
import type { DeliverOrderPayload, DeliveryChannel } from '@/types/orders'
import { codPaymentStatusMeta } from '@/constants/status'
import { formatAmount } from '@/utils/format'

/** Repli front du coût transporteur, aligné sur DELIVERY_DEFAULT_CARRIER_FEE. */
const DEFAULT_CARRIER_FEE = 2000

const props = defineProps<{
  modelValue: boolean
  orderName?: string
  orderTotal?: string | number
  regionCode?: string
  channel?: DeliveryChannel
  /** Présence d'un livreur interne assigné (pilote le pré-remplissage rémunération). */
  hasCourier?: boolean
  /** Transporteur assigné (pour récupérer son prix indicatif). */
  carrierId?: string
  shippingPrice?: string | number
  currency?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: DeliverOrderPayload]
}>()

const deliveryFeesStore = useDeliveryFeesStore()
const carriersStore = useCarriersStore()
const { config } = storeToRefs(deliveryFeesStore)
const { byId: carriersById } = storeToRefs(carriersStore)

const collectedAmount = ref('')
const courierFee = ref('')
const carrierFee = ref('')
const note = ref('')

const isCarrier = computed(() => props.channel === 'carrier')

const expectedAmount = computed(() => {
  const value = Number(props.orderTotal)
  return Number.isFinite(value) ? value : 0
})

const collectedValue = computed(() => {
  const value = Number(collectedAmount.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
})
const courierFeeValue = computed(() => {
  const value = Number(courierFee.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
})
const carrierFeeValue = computed(() => {
  if (!isCarrier.value) return 0
  const value = Number(carrierFee.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
})
const netRemitted = computed(() => collectedValue.value - courierFeeValue.value - carrierFeeValue.value)

/** Aperçu du statut de paiement (le backend recalcule, ceci n'est qu'indicatif). */
const paymentPreview = computed(() => {
  if (collectedValue.value >= expectedAmount.value && expectedAmount.value > 0) return 'paid'
  if (collectedValue.value > 0) return 'partial'
  return 'unpaid'
})
const paymentMeta = computed(() => codPaymentStatusMeta[paymentPreview.value])

const collectedInvalid = computed(() => collectedAmount.value !== '' && collectedValue.value < 0)
const netInvalid = computed(() => netRemitted.value < 0)
const canSubmit = computed(
  () => !props.submitting && collectedAmount.value !== '' && !collectedInvalid.value && !netInvalid.value,
)

/** Coût transporteur pré-rempli : prix indicatif transporteur / shipping / défaut. */
function prefilledCarrierFee(): number {
  const carrier = props.carrierId ? carriersById.value.get(props.carrierId) : undefined
  if (carrier && typeof carrier.defaultPrice === 'number') return carrier.defaultPrice
  const shipping = Number(props.shippingPrice)
  if (Number.isFinite(shipping) && shipping >= 0) return shipping
  return DEFAULT_CARRIER_FEE
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    note.value = ''
    collectedAmount.value = String(expectedAmount.value)

    // Rémunération livreur : pré-remplie depuis le barème seulement si un livreur encaisse.
    if (props.hasCourier) {
      await deliveryFeesStore.ensureLoaded()
      courierFee.value = String(resolveDeliveryFee(config.value, props.regionCode))
    } else {
      courierFee.value = '0'
    }

    // Coût transporteur : uniquement pour le canal carrier.
    if (isCarrier.value) {
      await carriersStore.ensureLoaded()
      carrierFee.value = String(prefilledCarrierFee())
    } else {
      carrierFee.value = '0'
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  const payload: DeliverOrderPayload = {
    collectedAmount: collectedValue.value,
    courierFee: courierFeeValue.value,
    note: note.value.trim() || undefined,
  }
  if (isCarrier.value) payload.carrierFee = carrierFeeValue.value
  emit('confirm', payload)
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
          :hint="hasCourier ? 'Pré-rempli depuis le barème de la région.' : 'Aucun livreur assigné : pas de rémunération.'"
          persistent-hint
          hide-details="auto"
          class="mb-3"
        />

        <v-text-field
          v-if="isCarrier"
          v-model="carrierFee"
          label="Coût transporteur"
          type="number"
          min="0"
          prepend-inner-icon="mdi-truck-minus-outline"
          :suffix="currency === 'XOF' ? 'FCFA' : currency"
          hint="Pré-rempli : prix transporteur, sinon shipping, sinon défaut."
          persistent-hint
          hide-details="auto"
          class="mb-4"
        />

        <v-sheet
          rounded="lg"
          :color="netInvalid ? 'error' : 'surface-light'"
          :variant="netInvalid ? 'tonal' : undefined"
          class="d-flex align-center justify-space-between px-4 py-3 mb-3"
        >
          <div>
            <div class="text-caption text-medium-emphasis">Net reversé en caisse</div>
            <div class="text-h6 font-weight-bold" :class="netInvalid ? 'text-error' : ''">
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

        <v-alert v-if="netInvalid" type="error" variant="tonal" density="compact" class="mb-3">
          Les coûts défalqués ne peuvent pas dépasser le montant encaissé.
        </v-alert>

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
