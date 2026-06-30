<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCouriersStore } from '@/stores/couriers'
import { useCarriersStore } from '@/stores/carriers'
import type { DeliveryChannel, DispatchOrderPayload } from '@/types/orders'

const props = defineProps<{
  modelValue: boolean
  orderName?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: DispatchOrderPayload]
}>()

const couriersStore = useCouriersStore()
const carriersStore = useCarriersStore()
const { activeCouriers, loading: couriersLoading } = storeToRefs(couriersStore)
const { activeCarriers, loading: carriersLoading } = storeToRefs(carriersStore)

const channel = ref<DeliveryChannel>('internal')
const courierId = ref<string | null>(null)
const carrierId = ref<string | null>(null)
const trackingNumber = ref('')

const channelOptions: { value: DeliveryChannel; label: string; icon: string }[] = [
  { value: 'internal', label: 'Livreur interne', icon: 'mdi-moped-outline' },
  { value: 'carrier', label: 'Transporteur tiers', icon: 'mdi-truck-delivery-outline' },
]

const courierOptions = computed(() =>
  activeCouriers.value.map((courier) => ({ value: courier.id, title: courier.name })),
)
const carrierOptions = computed(() =>
  activeCarriers.value.map((carrier) => ({ value: carrier.id, title: carrier.name })),
)

const canSubmit = computed(() => {
  if (props.submitting) return false
  if (channel.value === 'internal') return Boolean(courierId.value)
  return Boolean(carrierId.value)
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      channel.value = 'internal'
      courierId.value = null
      carrierId.value = null
      trackingNumber.value = ''
      void couriersStore.ensureLoaded()
      void carriersStore.ensureLoaded()
    }
  },
)

function close() {
  if (props.submitting) return
  emit('update:modelValue', false)
}

function submit() {
  if (!canSubmit.value) return
  const payload: DispatchOrderPayload = { channel: channel.value }
  if (channel.value === 'internal') {
    if (courierId.value) payload.courierId = courierId.value
  } else {
    if (carrierId.value) payload.carrierId = carrierId.value
    // Livreur optionnel : celui qui amène le colis au transporteur et encaisse le cash.
    if (courierId.value) payload.courierId = courierId.value
    if (trackingNumber.value.trim()) payload.trackingNumber = trackingNumber.value.trim()
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
        <v-avatar color="info" variant="tonal" rounded="lg" size="40">
          <v-icon icon="mdi-truck-fast-outline" />
        </v-avatar>
        Expédier la commande {{ orderName }}
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Choisissez le canal de livraison. La commande passera en « Livraison en cours ».
        </p>

        <v-btn-toggle
          v-model="channel"
          mandatory
          color="primary"
          variant="outlined"
          divided
          class="mb-4 d-flex"
        >
          <v-btn
            v-for="option in channelOptions"
            :key="option.value"
            :value="option.value"
            :prepend-icon="option.icon"
            class="flex-grow-1 text-none"
          >
            {{ option.label }}
          </v-btn>
        </v-btn-toggle>

        <!-- Canal interne : livreur requis -->
        <v-select
          v-if="channel === 'internal'"
          v-model="courierId"
          label="Livreur assigné"
          :items="courierOptions"
          :loading="couriersLoading"
          prepend-inner-icon="mdi-account-outline"
          hide-details="auto"
          :no-data-text="couriersLoading ? 'Chargement…' : 'Aucun livreur actif'"
          :hint="!courierOptions.length && !couriersLoading ? 'Ajoutez un livreur dans « Livreurs ».' : undefined"
          persistent-hint
        />

        <!-- Canal transporteur : transporteur requis + livreur optionnel + suivi -->
        <template v-else>
          <v-select
            v-model="carrierId"
            label="Transporteur tiers"
            :items="carrierOptions"
            :loading="carriersLoading"
            prepend-inner-icon="mdi-truck-delivery-outline"
            hide-details="auto"
            class="mb-3"
            :no-data-text="carriersLoading ? 'Chargement…' : 'Aucun transporteur actif'"
            :hint="!carrierOptions.length && !carriersLoading ? 'Ajoutez un transporteur dans « Transporteurs ».' : undefined"
            persistent-hint
          />
          <v-select
            v-model="courierId"
            label="Livreur qui encaisse (optionnel)"
            :items="courierOptions"
            :loading="couriersLoading"
            prepend-inner-icon="mdi-account-cash-outline"
            hide-details="auto"
            clearable
            class="mb-3"
            hint="Le livreur qui détient le cash et porte la rémunération livreur."
            persistent-hint
            :no-data-text="couriersLoading ? 'Chargement…' : 'Aucun livreur actif'"
          />
          <v-text-field
            v-model="trackingNumber"
            label="N° de suivi (optionnel)"
            prepend-inner-icon="mdi-barcode"
            hide-details
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="submitting" @click="close">Retour</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Expédier
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
