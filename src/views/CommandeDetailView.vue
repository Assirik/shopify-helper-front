<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '@/stores/orders'
import { orderActionCapabilities, type OrderMessage } from '@/types/orders'
import {
  channelMeta,
  customerConfirmationStatusMeta,
  lookupMeta,
  messageStatusMeta,
  templatePurposeMeta,
  formatProvider,
} from '@/constants/status'
import { formatAmount, formatDateTime, formatNullable, formatPhone } from '@/utils/format'
import { orderActionErrorMessage, messageRetryErrorMessage } from '@/utils/orderErrors'
import { messagesService } from '@/services/messages.service'
import StatusChip from '@/components/StatusChip.vue'
import CancelOrderDialog from '@/components/CancelOrderDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useOrdersStore()
const { detail, detailMessages, detailSummary, detailLoading, detailErrorCode } = storeToRefs(store)

const orderId = computed(() => String(route.params.id))
const snackbar = ref({ show: false, text: '', color: 'neutral' })
const cancelOpen = ref(false)
const retryingIds = ref<string[]>([])

const capabilities = computed(() =>
  detail.value
    ? orderActionCapabilities(detail.value.customerConfirmationStatus)
    : { canConfirm: false, canRemind: false, canCancel: false },
)
const actionLoading = computed(() => (detail.value ? store.mutatingIds.includes(detail.value.id) : false))

const lineItems = computed(() => detail.value?.lineItems ?? [])
const tags = computed(() => detail.value?.tags ?? [])

const lineItemHeaders = [
  { title: 'Produit', key: 'product', sortable: false },
  { title: 'Qté', key: 'quantity', sortable: false, align: 'center' as const, width: 70 },
  { title: 'Prix', key: 'price', sortable: false, align: 'end' as const, width: 120 },
]

function goBack() {
  void router.push({ name: 'commandes' })
}

async function confirmOrder() {
  if (!detail.value) return
  try {
    await store.confirm(detail.value.id)
    snackbar.value = { show: true, text: 'Commande confirmée.', color: 'success' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function remindOrder() {
  if (!detail.value) return
  try {
    await store.remind(detail.value.id)
    snackbar.value = { show: true, text: 'Relance envoyée.', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitCancellation(reason: string) {
  if (!detail.value) return
  try {
    await store.cancel(detail.value.id, reason)
    cancelOpen.value = false
    snackbar.value = { show: true, text: 'Commande annulée.', color: 'error' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function retryMessage(message: OrderMessage) {
  retryingIds.value = [...retryingIds.value, message.id]
  try {
    await messagesService.retry(message.id)
    await store.fetchDetail(orderId.value)
    snackbar.value = { show: true, text: 'Nouvel envoi du message lancé.', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: messageRetryErrorMessage(cause), color: 'error' }
  } finally {
    retryingIds.value = retryingIds.value.filter((id) => id !== message.id)
  }
}

onMounted(() => {
  void store.fetchDetail(orderId.value)
})
</script>

<template>
  <section class="order-detail">
    <v-btn
      variant="text"
      size="small"
      prepend-icon="mdi-arrow-left"
      class="mb-3"
      @click="goBack"
    >
      Commandes
    </v-btn>

    <v-progress-linear v-if="detailLoading && !detail" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="detailErrorCode && !detail" type="error" variant="tonal" class="mb-4" role="alert">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>La commande n’a pas pu être chargée.</span>
        <v-btn variant="text" size="small" @click="store.fetchDetail(orderId)">Réessayer</v-btn>
      </div>
    </v-alert>

    <template v-if="detail">
      <!-- Header + actions -->
      <div class="d-flex align-start justify-space-between ga-4 flex-wrap mb-5">
        <div>
          <div class="d-flex align-center ga-3 flex-wrap mb-1">
            <h1 class="text-h5 font-weight-bold">{{ detail.shopifyOrderName }}</h1>
            <StatusChip :table="customerConfirmationStatusMeta" :value="detail.customerConfirmationStatus" size="default" />
            <v-chip v-if="detail.isCashOnDelivery" size="small" color="primary" variant="outlined">COD</v-chip>
          </div>
          <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis flex-wrap">
            <span>{{ formatNullable(detail.customerName) }}</span>
            <span>·</span>
            <span>{{ formatDateTime(detail.createdAt) }}</span>
            <template v-if="detail.shopifyAdminUrl">
              <span>·</span>
              <a :href="detail.shopifyAdminUrl" target="_blank" rel="noopener" class="text-primary d-inline-flex align-center ga-1">
                Voir sur Shopify <v-icon icon="mdi-open-in-new" size="14" />
              </a>
            </template>
          </div>
        </div>
        <div class="d-flex align-center ga-2">
          <v-btn
            v-if="capabilities.canRemind"
            variant="outlined"
            border="sm opacity-25"
            prepend-icon="mdi-refresh"
            :loading="actionLoading"
            @click="remindOrder"
          >
            Relancer
          </v-btn>
          <v-btn
            v-if="capabilities.canCancel"
            variant="outlined"
            color="error"
            prepend-icon="mdi-close"
            :loading="actionLoading"
            @click="cancelOpen = true"
          >
            Annuler
          </v-btn>
          <v-btn
            v-if="capabilities.canConfirm"
            color="success"
            prepend-icon="mdi-check"
            :loading="actionLoading"
            @click="confirmOrder"
          >
            Confirmer
          </v-btn>
        </div>
      </div>

      <div class="detail-grid">
        <!-- LEFT -->
        <div class="d-flex flex-column ga-4">
          <!-- Client -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-account-outline" color="primary" size="20" /> Client
            </v-card-title>
            <v-card-text>
              <dl class="info-list">
                <div><dt>Nom complet</dt><dd>{{ formatNullable(detail.customerName) }}</dd></div>
                <div><dt>Téléphone</dt><dd>{{ formatPhone(detail.customerPhoneE164) }}</dd></div>
                <div><dt>Email</dt><dd>{{ formatNullable(detail.customerEmail) }}</dd></div>
              </dl>
            </v-card-text>
          </v-card>

          <!-- Livraison -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-truck-outline" color="primary" size="20" /> Livraison
              <span class="text-caption text-medium-emphasis font-weight-regular">· instantané commande</span>
            </v-card-title>
            <v-card-text>
              <dl class="info-list">
                <div>
                  <dt>Région</dt>
                  <dd>
                    {{ formatNullable(detail.deliveryRegion ?? detail.shippingRegion) }}
                    <span v-if="detail.deliveryRegionCode" class="text-medium-emphasis">({{ detail.deliveryRegionCode }})</span>
                  </dd>
                </div>
                <div><dt>Adresse</dt><dd class="text-right">{{ formatNullable(detail.shippingAddress) }}</dd></div>
                <div><dt>Créneau préféré</dt><dd>{{ formatNullable(detail.deliverySlot) }}</dd></div>
                <div v-if="detail.mapUrl">
                  <dt>Carte</dt>
                  <dd>
                    <a :href="detail.mapUrl" target="_blank" rel="noopener" class="text-primary d-inline-flex align-center ga-1">
                      Ouvrir GPS <v-icon icon="mdi-map-outline" size="15" />
                    </a>
                  </dd>
                </div>
              </dl>
            </v-card-text>
          </v-card>

          <!-- Articles -->
          <v-card border flat rounded="lg" class="overflow-hidden">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-package-variant-closed" color="primary" size="20" /> Articles
              <span class="text-caption text-medium-emphasis font-weight-regular">· {{ lineItems.length }} article(s)</span>
            </v-card-title>
            <v-data-table
              v-if="lineItems.length"
              :headers="lineItemHeaders"
              :items="lineItems"
              density="comfortable"
              hide-default-footer
              :items-per-page="-1"
            >
              <template #item.product="{ item }">
                <div class="font-weight-medium">{{ formatNullable(item.productTitle ?? item.title) }}</div>
                <div class="text-caption text-medium-emphasis">
                  <span v-if="item.variantTitle">{{ item.variantTitle }}</span>
                  <span v-if="item.sku"> · SKU {{ item.sku }}</span>
                </div>
              </template>
              <template #item.quantity="{ item }">{{ formatNullable(item.quantity) }}</template>
              <template #item.price="{ item }">{{ formatAmount(item.price, detail?.currency) }}</template>
            </v-data-table>
            <v-card-text v-else class="text-body-2 text-medium-emphasis">
              Aucun article enregistré sur cette commande.
            </v-card-text>
          </v-card>

          <div class="amounts-grid">
            <!-- Montants -->
            <v-card border flat rounded="lg">
              <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
                <v-icon icon="mdi-cash-multiple" color="primary" size="20" /> Montants
              </v-card-title>
              <v-card-text>
                <div class="amount-row"><span>Sous-total</span><span>{{ formatAmount(detail.subtotalPrice, detail.currency) }}</span></div>
                <div class="amount-row"><span>Livraison</span><span>{{ formatAmount(detail.shippingPrice, detail.currency) }}</span></div>
                <div class="amount-row"><span>Remise</span><span class="text-success">{{ formatAmount(detail.totalDiscount, detail.currency) }}</span></div>
                <v-divider class="my-2" />
                <div class="amount-row text-subtitle-1 font-weight-bold"><span>Total</span><span>{{ formatAmount(detail.totalPrice, detail.currency) }}</span></div>
                <v-sheet
                  v-if="detail.amountToCollect !== undefined && detail.amountToCollect !== null"
                  rounded="lg"
                  color="attention"
                  variant="tonal"
                  class="d-flex align-center justify-space-between px-3 py-2 mt-3"
                >
                  <span class="text-body-2 font-weight-medium">Reste à collecter</span>
                  <span class="text-subtitle-1 font-weight-bold">{{ formatAmount(detail.amountToCollect, detail.currency) }}</span>
                </v-sheet>
              </v-card-text>
            </v-card>

            <!-- Paiement -->
            <v-card border flat rounded="lg">
              <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
                <v-icon icon="mdi-wallet-outline" color="primary" size="20" /> Paiement
              </v-card-title>
              <v-card-text>
                <div class="font-weight-medium mb-1">
                  {{ detail.isCashOnDelivery ? 'Paiement à la livraison' : formatNullable(detail.paymentMethod) }}
                </div>
                <div class="text-caption text-medium-emphasis mb-3">Devise : {{ formatNullable(detail.currency) }}</div>
                <v-chip v-if="detail.isCashOnDelivery" color="primary" variant="tonal" size="small" prepend-icon="mdi-cash">COD</v-chip>
              </v-card-text>
            </v-card>
          </div>

          <!-- Tags & source -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-tag-outline" color="primary" size="20" /> Tags & source
            </v-card-title>
            <v-card-text>
              <div v-if="tags.length" class="d-flex flex-wrap ga-2 mb-3">
                <v-chip v-for="tag in tags" :key="tag" size="small" variant="tonal" color="neutral">{{ tag }}</v-chip>
              </div>
              <div class="amount-row"><span class="text-medium-emphasis">Source</span><span>{{ formatNullable(detail.source) }}</span></div>
            </v-card-text>
          </v-card>
        </div>

        <!-- RIGHT -->
        <div class="d-flex flex-column ga-4">
          <!-- Statut confirmation -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-clipboard-check-outline" color="primary" size="20" /> Statut de confirmation
            </v-card-title>
            <v-card-text>
              <StatusChip :table="customerConfirmationStatusMeta" :value="detail.customerConfirmationStatus" size="default" class="mb-3" />
              <dl class="info-grid">
                <div><dt>Source</dt><dd>{{ formatNullable(detail.confirmationSource) }}</dd></div>
                <div><dt>Date décision</dt><dd>{{ formatDateTime(detail.confirmedAt ?? detail.cancelledAt) }}</dd></div>
                <div><dt>Relances</dt><dd>{{ formatNullable(detail.reminderCount ?? 0) }}</dd></div>
                <div><dt>Dernière relance</dt><dd>{{ formatDateTime(detail.lastReminderAt) }}</dd></div>
              </dl>
            </v-card-text>
          </v-card>

          <!-- Dernier message client -->
          <v-card
            v-if="detail.lastCustomerMessage"
            border
            flat
            rounded="lg"
            color="attention"
            variant="tonal"
          >
            <v-card-text>
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon icon="mdi-forum-outline" size="20" />
                <span class="text-subtitle-2 font-weight-bold">Dernier message du client</span>
              </div>
              <p class="text-body-1 font-italic mb-1">« {{ detail.lastCustomerMessage }} »</p>
              <div class="text-caption text-medium-emphasis">{{ formatDateTime(detail.lastCustomerMessageAt) }}</div>
            </v-card-text>
          </v-card>

          <!-- Timeline messages -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-timeline-clock-outline" color="primary" size="20" /> Timeline des messages
              <span class="text-caption text-medium-emphasis font-weight-regular">· {{ detailMessages.length }}</span>
            </v-card-title>
            <v-card-text>
              <div v-if="detailSummary" class="d-flex flex-wrap ga-2 mb-4">
                <v-chip size="small" variant="tonal" color="success" prepend-icon="mdi-whatsapp">{{ detailSummary.byChannel.whatsapp ?? 0 }} WhatsApp</v-chip>
                <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-message-text-outline">{{ detailSummary.byChannel.sms ?? 0 }} SMS</v-chip>
                <v-chip size="small" variant="tonal" color="error" prepend-icon="mdi-alert-circle-outline">{{ detailSummary.byStatus.failed ?? 0 }} échec(s)</v-chip>
              </div>

              <p v-if="!detailMessages.length" class="text-body-2 text-medium-emphasis mb-0">
                Aucun message lié à cette commande.
              </p>

              <v-timeline v-else side="end" align="start" density="compact" truncate-line="both">
                <v-timeline-item
                  v-for="message in detailMessages"
                  :key="message.id"
                  :dot-color="lookupMeta(messageStatusMeta, message.status).color"
                  size="x-small"
                >
                  <div class="message-item">
                    <div class="d-flex align-center ga-2 flex-wrap mb-1">
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="lookupMeta(channelMeta, message.channel).color"
                        :prepend-icon="lookupMeta(channelMeta, message.channel).icon"
                      >
                        {{ lookupMeta(channelMeta, message.channel).label }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">{{ formatProvider(message.provider) }}</span>
                      <v-spacer />
                      <span
                        class="text-caption font-weight-medium d-inline-flex align-center ga-1"
                        :class="`text-${lookupMeta(messageStatusMeta, message.status).color}`"
                      >
                        <v-icon :icon="lookupMeta(messageStatusMeta, message.status).icon" size="15" />
                        {{ lookupMeta(messageStatusMeta, message.status).label }}
                      </span>
                    </div>
                    <div class="text-body-2 font-weight-medium">
                      {{ message.templatePurpose ? lookupMeta(templatePurposeMeta, message.templatePurpose).label : formatNullable(message.templateName) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ formatDateTime(message.createdAt) }}</div>
                    <v-sheet v-if="message.body" rounded="lg" color="surface-light" class="px-3 py-2 mt-2 text-body-2 font-italic">
                      « {{ message.body }} »
                    </v-sheet>
                    <v-alert
                      v-if="message.status === 'failed'"
                      type="error"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      <div class="d-flex align-center justify-space-between ga-3">
                        <span class="text-caption">{{ formatNullable(message.errorMessage ?? message.errorCode) }}</span>
                        <v-btn
                          size="x-small"
                          variant="outlined"
                          color="error"
                          prepend-icon="mdi-refresh"
                          :loading="retryingIds.includes(message.id)"
                          @click="retryMessage(message)"
                        >
                          Réessayer
                        </v-btn>
                      </div>
                    </v-alert>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </template>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>

    <CancelOrderDialog
      v-model="cancelOpen"
      :order-name="detail?.shopifyOrderName"
      :submitting="actionLoading"
      @confirm="submitCancellation"
    />
  </section>
</template>

<style scoped>
.order-detail {
  min-width: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 18px;
  align-items: start;
}

@media (max-width: 1100px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.amounts-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  align-items: start;
}

.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.info-list > div:last-child {
  border-bottom: none;
}
.info-list dt {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  font-size: 0.8125rem;
}
.info-list dd {
  font-weight: 500;
  font-size: 0.8438rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.info-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.info-grid dt {
  font-size: 0.72rem;
  opacity: 0.6;
}
.info-grid dd {
  font-size: 0.8125rem;
  font-weight: 500;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.8438rem;
}

.message-item {
  min-width: 0;
}
</style>
