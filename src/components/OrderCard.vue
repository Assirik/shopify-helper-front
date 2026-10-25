<script setup lang="ts">
import type { OrderActionCapabilities, OrderListItem } from '@/types/orders'
import { customerConfirmationStatusMeta, operationalStatusMeta } from '@/constants/status'
import { formatAmount, formatDateTime, formatNullable, formatPhone } from '@/utils/format'
import StatusChip from '@/components/StatusChip.vue'

/**
 * Fiche d'une commande pour la vue « cartes » de la liste. Purement présentationnelle :
 * la sélection et les actions remontent à la vue, qui les relaie au store.
 */
defineProps<{
  order: OrderListItem
  capabilities: OrderActionCapabilities
  selected: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:selected': [value: boolean]
  open: []
  confirm: []
  remind: []
  cancel: []
}>()
</script>

<template>
  <v-card
    border
    flat
    rounded="lg"
    class="order-card d-flex flex-column"
    :class="{ 'order-card--selected': selected }"
    role="button"
    tabindex="0"
    @click="emit('open')"
    @keyup.enter.self="emit('open')"
  >
    <v-card-text class="pb-2">
      <div class="d-flex align-center ga-2 mb-3">
        <v-checkbox-btn
          :model-value="selected"
          density="compact"
          class="flex-grow-0"
          :aria-label="`Sélectionner ${order.shopifyOrderName}`"
          @click.stop
          @update:model-value="(value: boolean) => emit('update:selected', value)"
        />
        <span class="font-weight-bold text-primary">{{ order.shopifyOrderName }}</span>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">{{ formatDateTime(order.createdAt) }}</span>
      </div>

      <div class="d-flex align-start justify-space-between ga-3 mb-3">
        <div class="min-width-0">
          <div class="font-weight-medium text-truncate">{{ formatNullable(order.customerName) }}</div>
          <div class="text-caption text-medium-emphasis">{{ formatPhone(order.customerPhoneE164) }}</div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <span class="font-weight-bold">{{ formatAmount(order.totalPrice, order.currency) }}</span>
          <v-chip v-if="order.isCashOnDelivery" size="x-small" color="primary" variant="tonal">COD</v-chip>
        </div>
      </div>

      <div class="d-flex flex-wrap ga-2 mb-3">
        <StatusChip :table="customerConfirmationStatusMeta" :value="order.customerConfirmationStatus" />
        <StatusChip v-if="order.operationalStatus" :table="operationalStatusMeta" :value="order.operationalStatus" />
      </div>

      <div class="d-flex align-center ga-1 text-body-2">
        <v-icon icon="mdi-map-marker-outline" size="16" class="text-medium-emphasis" />
        <span class="text-truncate">{{ formatNullable(order.deliveryRegion ?? order.shippingRegion) }}</span>
      </div>

      <div v-if="order.lastNoteText" class="d-flex align-start ga-1 text-body-2 text-medium-emphasis mt-2">
        <v-icon icon="mdi-note-text-outline" size="16" class="mt-1" />
        <span class="order-card__note">{{ order.lastNoteText }}</span>
      </div>
    </v-card-text>

    <v-spacer />

    <v-card-actions
      v-if="capabilities.canConfirm || capabilities.canRemind || capabilities.canCancel"
      class="justify-end pt-0"
      @click.stop
    >
      <v-btn
        v-if="capabilities.canConfirm"
        color="success"
        size="small"
        prepend-icon="mdi-check"
        :loading="loading"
        @click="emit('confirm')"
      >
        Confirmer
      </v-btn>
      <v-btn
        v-if="capabilities.canRemind"
        color="primary"
        size="small"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="emit('remind')"
      >
        Relancer
      </v-btn>
      <v-btn
        v-if="capabilities.canCancel"
        color="error"
        size="small"
        prepend-icon="mdi-close"
        :loading="loading"
        @click="emit('cancel')"
      >
        Annuler
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.order-card {
  cursor: pointer;
  height: 100%;
}

.order-card--selected {
  border-color: rgb(var(--v-theme-primary)) !important;
}

.min-width-0 {
  min-width: 0;
}

/* Note limitée à deux lignes : l'historique complet reste sur la fiche détail. */
.order-card__note {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
