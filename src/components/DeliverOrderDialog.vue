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
// Cases « Pas de frais » : forcent un 0 explicite et désactivent le champ.
const courierNoFee = ref(false)
const carrierNoFee = ref(false)
// Vrai quand un livreur encaisse mais que le barème n'a pas pu être chargé :
// on n'auto-remplit pas 0, l'agent doit saisir le montant manuellement.
const feeScheduleUnavailable = ref(false)
const note = ref('')

const isCarrier = computed(() => props.channel === 'carrier')

const expectedAmount = computed(() => {
  const value = Number(props.orderTotal)
  return Number.isFinite(value) ? value : 0
})

/**
 * Parse un montant saisi : `null` si vide, non numérique ou négatif (bloque la
 * confirmation), sinon le nombre. `allowZero` permet le `0` explicite (frais) ;
 * désactivé, `0` est rejeté (le montant encaissé doit être strictement positif).
 * Aucun repli `0` : une saisie invalide ne doit jamais devenir 0 silencieusement.
 */
function parseAmount(raw: string, allowZero = true): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  if (!allowZero && value === 0) return null
  return value
}

// Montant encaissé : requis, numérique, strictement positif (jamais 0 ni vide).
const collectedValue = computed(() => parseAmount(collectedAmount.value, false))
const courierFeeValue = computed<number | null>(() =>
  courierNoFee.value ? 0 : parseAmount(courierFee.value),
)
const carrierFeeValue = computed<number | null>(() => {
  if (!isCarrier.value) return 0
  return carrierNoFee.value ? 0 : parseAmount(carrierFee.value)
})

const netRemitted = computed<number | null>(() => {
  const collected = collectedValue.value
  const courier = courierFeeValue.value
  const carrier = carrierFeeValue.value
  if (collected === null || courier === null || carrier === null) return null
  return collected - courier - carrier
})

/** Aperçu du statut de paiement (le backend recalcule, ceci n'est qu'indicatif). */
const paymentPreview = computed(() => {
  const collected = collectedValue.value ?? 0
  if (collected >= expectedAmount.value && expectedAmount.value > 0) return 'paid'
  if (collected > 0) return 'partial'
  return 'unpaid'
})
const paymentMeta = computed(() => codPaymentStatusMeta[paymentPreview.value])

const collectedInvalid = computed(() => collectedValue.value === null)
const courierFeeInvalid = computed(() => !courierNoFee.value && courierFeeValue.value === null)
const carrierFeeInvalid = computed(
  () => isCarrier.value && !carrierNoFee.value && carrierFeeValue.value === null,
)
const netInvalid = computed(() => netRemitted.value !== null && netRemitted.value < 0)

const canSubmit = computed(
  () =>
    !props.submitting &&
    collectedValue.value !== null &&
    courierFeeValue.value !== null &&
    carrierFeeValue.value !== null &&
    netRemitted.value !== null &&
    netRemitted.value >= 0,
)

/** Coût transporteur pré-rempli : prix indicatif transporteur / shipping / défaut. */
function prefilledCarrierFee(): number {
  const carrier = props.carrierId ? carriersById.value.get(props.carrierId) : undefined
  if (carrier && typeof carrier.defaultPrice === 'number') return carrier.defaultPrice
  const shipping = Number(props.shippingPrice)
  if (Number.isFinite(shipping) && shipping >= 0) return shipping
  return DEFAULT_CARRIER_FEE
}

/**
 * Pré-remplissage attendu de la rémunération livreur : depuis le barème de la
 * région, uniquement si un livreur encaisse ET que le barème a pu être chargé.
 * Sinon chaîne vide → l'agent doit saisir une valeur (ou cocher « Pas de frais »).
 */
async function courierPrefill(): Promise<string> {
  if (!props.hasCourier) {
    feeScheduleUnavailable.value = false
    return ''
  }
  await deliveryFeesStore.ensureLoaded()
  if (!config.value) {
    // Barème indisponible : pas de pré-remplissage 0, l'agent saisit manuellement.
    feeScheduleUnavailable.value = true
    return ''
  }
  feeScheduleUnavailable.value = false
  return String(resolveDeliveryFee(config.value, props.regionCode))
}

async function restoreCourierFee() {
  courierFee.value = await courierPrefill()
}

async function restoreCarrierFee() {
  await carriersStore.ensureLoaded()
  carrierFee.value = String(prefilledCarrierFee())
}

function setCourierNoFee(value: boolean | null) {
  courierNoFee.value = Boolean(value)
  if (courierNoFee.value) courierFee.value = '0'
  else void restoreCourierFee()
}

function setCarrierNoFee(value: boolean | null) {
  carrierNoFee.value = Boolean(value)
  if (carrierNoFee.value) carrierFee.value = '0'
  else void restoreCarrierFee()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    note.value = ''
    feeScheduleUnavailable.value = false
    collectedAmount.value = String(expectedAmount.value)

    // Rémunération livreur : pré-remplie depuis le barème seulement si un livreur encaisse.
    // Sans livreur assigné, « Pas de frais » est coché par défaut (cohérent avec le back).
    if (props.hasCourier) {
      courierNoFee.value = false
      courierFee.value = await courierPrefill()
    } else {
      courierNoFee.value = true
      courierFee.value = '0'
    }

    // Coût transporteur : uniquement pour le canal carrier.
    carrierNoFee.value = false
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
  const collected = collectedValue.value
  const courier = courierFeeValue.value
  // Gardes de narrowing TS : canSubmit garantit déjà la non-nullité.
  if (collected === null || courier === null) return

  const payload: DeliverOrderPayload = {
    collectedAmount: collected,
    courierFee: courier,
    note: note.value.trim() || undefined,
  }
  if (isCarrier.value) {
    const carrier = carrierFeeValue.value
    if (carrier === null) return
    payload.carrierFee = carrier
  }
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
          :error-messages="collectedInvalid ? 'Montant requis (strictement positif).' : undefined"
          hide-details="auto"
          class="mb-3"
        />

        <div class="mb-3">
          <v-text-field
            v-model="courierFee"
            label="Rémunération livreur"
            type="number"
            min="0"
            prepend-inner-icon="mdi-cash-minus"
            :suffix="currency === 'XOF' ? 'FCFA' : currency"
            :disabled="courierNoFee"
            :error="courierFeeInvalid"
            :error-messages="courierFeeInvalid ? 'Valeur requise (≥ 0).' : undefined"
            :hint="!hasCourier ? 'Aucun livreur assigné : pas de rémunération.' : (feeScheduleUnavailable ? '' : 'Pré-rempli depuis le barème de la région.')"
            persistent-hint
            hide-details="auto"
          />
          <div
            v-if="feeScheduleUnavailable && !courierNoFee"
            class="text-caption text-warning d-flex align-center ga-1 mt-1"
          >
            <v-icon icon="mdi-alert-outline" size="14" /> Barème indisponible, saisir le montant manuellement.
          </div>
          <v-checkbox
            :model-value="courierNoFee"
            label="Pas de frais"
            density="compact"
            hide-details
            @update:model-value="setCourierNoFee"
          />
        </div>

        <div v-if="isCarrier" class="mb-4">
          <v-text-field
            v-model="carrierFee"
            label="Coût transporteur"
            type="number"
            min="0"
            prepend-inner-icon="mdi-truck-minus-outline"
            :suffix="currency === 'XOF' ? 'FCFA' : currency"
            :disabled="carrierNoFee"
            :error="carrierFeeInvalid"
            :error-messages="carrierFeeInvalid ? 'Valeur requise (≥ 0).' : undefined"
            hint="Pré-rempli : prix transporteur, sinon shipping, sinon défaut."
            persistent-hint
            hide-details="auto"
          />
          <v-checkbox
            :model-value="carrierNoFee"
            label="Pas de frais"
            density="compact"
            hide-details
            @update:model-value="setCarrierNoFee"
          />
        </div>

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
