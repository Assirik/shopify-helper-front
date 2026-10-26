<script setup lang="ts">
import { computed } from 'vue'
import type { OrderActionCapabilities, OrderListItem } from '@/types/orders'
import {
  formatAmount,
  formatDateTime,
  formatNullable,
  formatPhone,
  formatRelativeDate,
  whatsappNumber,
} from '@/utils/format'
import { ORDER_STAGE_STEPS, orderStage } from '@/utils/orderStage'

/**
 * Fiche d'une commande pour la vue « cartes » de la liste. Purement présentationnelle :
 * la sélection et les actions remontent à la vue, qui les relaie au store.
 *
 * Lecture en trois temps : qui / combien, où en est la commande (piste du parcours COD),
 * puis les actions possibles, en bas de carte sous la zone de livraison.
 */
const props = defineProps<{
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

const stage = computed(() => orderStage(props.order))
const region = computed(() => props.order.deliveryRegion?.trim() || props.order.shippingRegion?.trim() || undefined)
const whatsapp = computed(() => whatsappNumber(props.order.customerPhoneE164))

const hasActions = computed(
  () => props.capabilities.canConfirm || props.capabilities.canRemind || props.capabilities.canCancel,
)

const stageAriaLabel = computed(
  () => `${stage.value.label} — ${stage.value.completed} étape(s) sur ${ORDER_STAGE_STEPS.length} franchie(s)`,
)

function segmentState(index: number) {
  if (index < stage.value.completed) return 'done'
  if (index === stage.value.completed && !stage.value.closed) return 'current'
  return 'todo'
}
</script>

<template>
  <article
    class="order-card"
    :class="{ 'order-card--selected': selected, 'order-card--closed': stage.closed }"
    :style="{ '--stage-color': `rgb(var(--v-theme-${stage.color}))` }"
    tabindex="0"
    :aria-label="`Commande ${order.shopifyOrderName}, ${formatNullable(order.customerName)}, ${stage.label}`"
    @click="emit('open')"
    @keyup.enter.self="emit('open')"
  >
    <header class="order-card__head">
      <v-checkbox-btn
        :model-value="selected"
        density="compact"
        class="order-card__check"
        color="primary"
        :aria-label="`Sélectionner ${order.shopifyOrderName}`"
        @click.stop
        @update:model-value="(value: boolean) => emit('update:selected', value)"
      />
      <span class="order-card__number">{{ order.shopifyOrderName }}</span>
      <v-spacer />
      <time
        class="order-card__date"
        :datetime="order.createdAt"
        :title="formatDateTime(order.createdAt)"
      >
        {{ formatRelativeDate(order.createdAt) }}
      </time>
    </header>

    <div class="order-card__body">
      <div class="order-card__who">
        <div class="order-card__customer text-truncate">{{ formatNullable(order.customerName) }}</div>
        <div class="order-card__contact">
          <span class="order-card__phone">{{ formatPhone(order.customerPhoneE164) }}</span>
          <template v-if="order.customerPhoneE164">
            <v-btn
              :href="`tel:${order.customerPhoneE164}`"
              icon="mdi-phone-outline"
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="`Appeler ${formatNullable(order.customerName)}`"
              @click.stop
            />
            <v-btn
              v-if="whatsapp"
              :href="`https://wa.me/${whatsapp}`"
              target="_blank"
              rel="noopener"
              icon="mdi-whatsapp"
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="`Écrire sur WhatsApp à ${formatNullable(order.customerName)}`"
              @click.stop
            />
          </template>
        </div>
      </div>
      <div class="order-card__money">
        <div class="order-card__amount">{{ formatAmount(order.totalPrice, order.currency) }}</div>
        <div class="order-card__payment">{{ order.isCashOnDelivery ? 'Paiement à la livraison' : 'Prépayée' }}</div>
      </div>
    </div>

    <div class="order-card__stage">
      <div class="order-card__track" role="img" :aria-label="stageAriaLabel">
        <span
          v-for="(step, index) in ORDER_STAGE_STEPS"
          :key="step"
          class="order-card__segment"
          :class="`order-card__segment--${segmentState(index)}`"
          :title="step"
        />
      </div>
      <div class="order-card__stage-label">
        <v-icon :icon="stage.icon" size="16" />
        {{ stage.label }}
      </div>
    </div>

    <blockquote v-if="order.lastNoteText" class="order-card__note">{{ order.lastNoteText }}</blockquote>

    <footer class="order-card__foot">
      <span class="order-card__region">
        <v-icon icon="mdi-map-marker-outline" size="16" />
        <span class="text-truncate">{{ region ?? 'Zone non renseignée' }}</span>
      </span>
      <div v-if="hasActions" class="order-card__actions" @click.stop>
        <v-btn
          v-if="capabilities.canConfirm"
          color="success"
          variant="tonal"
          size="small"
          rounded="lg"
          prepend-icon="mdi-check"
          class="order-card__action px-1"
          :loading="loading"
          @click="emit('confirm')"
        >
          Confirmer
        </v-btn>
        <v-btn
          v-if="capabilities.canRemind"
          color="primary"
          :variant="capabilities.canConfirm ? 'text' : 'tonal'"
          size="small"
          rounded="lg"
          prepend-icon="mdi-bell-ring-outline"
          class="order-card__action px-1"
          :loading="loading"
          @click="emit('remind')"
        >
          Relancer
        </v-btn>
        <v-btn
          v-if="capabilities.canCancel"
          color="error"
          variant="text"
          size="small"
          rounded="lg"
          prepend-icon="mdi-close"
          class="order-card__action order-card__action--cancel"
          :disabled="loading"
          @click="emit('cancel')"
        >
          Annuler
        </v-btn>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.order-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 14px 14px 12px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  container-type: inline-size;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.order-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.28);
}

.order-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.order-card--selected,
.order-card--selected:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

/* En-tête : sélection, numéro, ancienneté, menu. */
.order-card__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: -6px -6px 0 -8px;
}

.order-card__check {
  flex: 0 0 auto;
}

.order-card__number {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.01em;
}

.order-card__date {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
}

/* Corps : qui à gauche, combien à droite. */
.order-card__body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-card__who {
  min-width: 0;
}

.order-card__customer {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
}

.order-card__contact {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: -2px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.order-card__phone {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-right: 4px;
  margin-left: 2px;
}

.order-card__money {
  flex: 0 0 auto;
  text-align: right;
}

.order-card__amount {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.order-card__payment {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Parcours COD : quatre segments, l'étape en cours est à demi-teinte. */
.order-card__stage {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-card__track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.order-card__segment {
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.order-card__segment--done {
  background: var(--stage-color);
}

.order-card__segment--current {
  background: color-mix(in srgb, var(--stage-color) 45%, transparent);
}

.order-card__stage-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--stage-color);
}

.order-card--closed .order-card__segment--done {
  background: rgba(var(--v-theme-on-surface), 0.32);
}

/* Dernière note : citation courte, l'historique complet reste sur le détail. */
.order-card__note {
  margin: 0;
  padding: 2px 0 2px 10px;
  border-left: 2px solid rgba(var(--v-theme-on-surface), 0.16);
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Pied : zone de livraison puis actions, toujours en bas de la carte. */
.order-card__foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.order-card__region {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.order-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.order-card__action {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

/* Annuler, destructive, est tenue à l'écart des actions qui font avancer la commande. */
.order-card__action--cancel {
  margin-left: auto;
}

/* Carte étroite (mobile, grille dense) : le montant passe sous le client. */
@container (max-width: 300px) {
  .order-card__body {
    flex-direction: column;
    gap: 8px;
  }

  .order-card__money {
    display: flex;
    align-items: baseline;
    gap: 8px;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-card {
    transition: none;
  }
}
</style>
