<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '@/stores/orders'
import { useCouriersStore } from '@/stores/couriers'
import { useCarriersStore } from '@/stores/carriers'
import {
  orderActionCapabilities,
  type AdminConfirmationSource,
  type DeliverOrderPayload,
  type DispatchOrderPayload,
  type OrderEvent,
  type OrderMessage,
} from '@/types/orders'
import {
  capiPurchaseStatusMeta,
  capiSkipReasonMeta,
  channelMeta,
  codPaymentStatusMeta,
  confirmationSourceMeta,
  customerConfirmationStatusMeta,
  deliveryChannelMeta,
  lookupMeta,
  messageStatusMeta,
  operationalStatusMeta,
  orderEventTypeMeta,
  templatePurposeMeta,
  formatProvider,
  isDeliberatelyNotSent,
  requiresCallConfirmation,
  notSentMessageMeta,
} from '@/constants/status'
import { formatAmount, formatDateTime, formatNullable, formatPhone } from '@/utils/format'
import { orderActionErrorMessage, messageRetryErrorMessage } from '@/utils/orderErrors'
import { messagesService } from '@/services/messages.service'
import StatusChip from '@/components/StatusChip.vue'
import CancelOrderDialog from '@/components/CancelOrderDialog.vue'
import DispatchOrderDialog from '@/components/DispatchOrderDialog.vue'
import DeliverOrderDialog from '@/components/DeliverOrderDialog.vue'
import OrderReasonDialog from '@/components/OrderReasonDialog.vue'
import ConfirmOrderDialog from '@/components/ConfirmOrderDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useOrdersStore()
const couriersStore = useCouriersStore()
const carriersStore = useCarriersStore()
const { detail, detailMessages, detailSummary, detailEvents, detailCapabilities, detailLoading, detailErrorCode } =
  storeToRefs(store)
const { byId: couriersById } = storeToRefs(couriersStore)
const { byId: carriersById } = storeToRefs(carriersStore)

const orderId = computed(() => String(route.params.id))
const snackbar = ref({ show: false, text: '', color: 'neutral' })
const cancelOpen = ref(false)
const dispatchOpen = ref(false)
const deliverOpen = ref(false)
const failureOpen = ref(false)
const returnOpen = ref(false)
const confirmOpen = ref(false)
const unreachableOpen = ref(false)
const noteText = ref('')
const NOTE_MAX_LENGTH = 5000
const retryingIds = ref<string[]>([])

// Capabilities : l'API fait foi ; repli local tant que la réponse ne les porte pas.
const capabilities = computed(() => {
  if (detailCapabilities.value) return detailCapabilities.value
  if (detail.value) {
    return orderActionCapabilities(detail.value.customerConfirmationStatus, detail.value.operationalStatus)
  }
  return {
    canConfirm: false,
    canRemind: false,
    canCancel: false,
    canDispatch: false,
    canDeliver: false,
    canMarkFailed: false,
    canReturn: false,
    canMarkUnreachable: false,
  }
})
const actionLoading = computed(() => (detail.value ? store.mutatingIds.includes(detail.value.id) : false))

const hasOperationalStatus = computed(() => Boolean(detail.value?.operationalStatus))
const hasCodInfo = computed(
  () => detail.value?.codCollectedAmount != null || detail.value?.codExpectedAmount != null,
)
const isCarrierChannel = computed(() => detail.value?.deliveryChannel === 'carrier')

// Noms livreur/transporteur résolus depuis les stores (l'API ne renvoie que les ids).
const assignedCourierName = computed(() => {
  const id = detail.value?.assignedCourierId
  return id ? couriersById.value.get(id)?.name : undefined
})
const assignedCarrierName = computed(() => {
  const id = detail.value?.assignedCarrierId
  return id ? carriersById.value.get(id)?.name : undefined
})

// Conversion Meta et origine publicitaire (Chantier 5) : champs facultatifs, les cartes
// n'apparaissent que si le backend les renvoie.
const euroFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
// Texte présent : chaîne non vide après trim, ou nombre fini. Tout autre type (objet, booléen…)
// venu d'un backend plus récent est ignoré sans erreur.
const hasText = (value: unknown): boolean =>
  typeof value === 'string' ? Boolean(value.trim()) : typeof value === 'number' && Number.isFinite(value)

const hasCapiStatus = computed(() => Boolean(detail.value?.capiPurchaseStatus))
const capiValueLabel = computed(() => {
  const value = detail.value?.capiValueEur
  return typeof value === 'number' && Number.isFinite(value) ? euroFormatter.format(value) : undefined
})

function skipReasonLabel(event: OrderEvent): string | undefined {
  if (event.type !== 'capi_purchase_skipped') return undefined
  const reason = event.metadata?.reason
  return typeof reason === 'string' && reason ? lookupMeta(capiSkipReasonMeta, reason).label : undefined
}
// Motif de la dernière conversion ignorée, lu dans l'historique (l'ordre de l'API n'est pas supposé).
const capiSkipReason = computed(() => {
  if (detail.value?.capiPurchaseStatus !== 'skipped') return undefined
  const latest = detailEvents.value
    .filter((event) => event.type === 'capi_purchase_skipped')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  return latest ? skipReasonLabel(latest) : undefined
})

const hasAdOrigin = computed(() => {
  const order = detail.value
  if (!order) return false
  return [order.campaignId, order.adsetId, order.adId, order.utmSource, order.utmMedium, order.fbclid].some(hasText)
})

// Messages volontairement non envoyés : ni échec, ni « Réessayer », hors du compteur d'échecs.
const failedMessageCount = computed(
  () => detailMessages.value.filter((message) => message.status === 'failed' && !isDeliberatelyNotSent(message)).length,
)

// « Numéro différent » : le message vient d'un autre numéro que celui de la commande.
const isPhoneMismatch = computed(() => detail.value?.attentionReasonCode === 'phone_mismatch')
// Le marqueur `phoneMismatchAt` survit au changement de motif : la confirmation reste réservée à l'appel.
const isCallRequired = computed(() => (detail.value ? requiresCallConfirmation(detail.value) : false))
const phoneMismatchSender = computed(() => {
  const latest = detailEvents.value
    .filter((event) => event.type === 'phone_mismatch')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  const sender = latest?.metadata?.senderE164
  return {
    phone: typeof sender === 'string' && sender ? sender : undefined,
    detectedAt: latest?.createdAt,
  }
})

const lineItems = computed(() => detail.value?.lineItems ?? [])
const tags = computed(() => detail.value?.tags ?? [])
const paymentGatewayLabel = computed(() => detail.value?.paymentGatewayNames?.join(', ') || undefined)
const deliveryMapUrl = computed(() => {
  const latitude = detail.value?.deliveryLatitude
  const longitude = detail.value?.deliveryLongitude
  if (latitude == null || longitude == null) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
})

const lineItemHeaders = [
  { title: 'Produit', key: 'product', sortable: false },
  { title: 'Qté', key: 'quantity', sortable: false, align: 'center' as const, width: 70 },
  { title: 'Prix', key: 'price', sortable: false, align: 'end' as const, width: 120 },
]

function goBack() {
  void router.push({ name: 'commandes' })
}

// Préc/suiv dans l'ordre de la liste filtrée. Accès direct par URL ou commande absente
// de la page courante : on masque la navigation plutôt que d'afficher des boutons inertes.
const showNeighborNav = computed(() => store.isInList(orderId.value))
const previousOrderId = computed(() => store.prevId(orderId.value))
const nextOrderId = computed(() => store.nextId(orderId.value))

function goToOrder(id: string | undefined) {
  if (id) void router.push({ name: 'commande-detail', params: { id } })
}

async function submitConfirmation(source: AdminConfirmationSource) {
  if (!detail.value) return
  try {
    await store.confirm(detail.value.id, source)
    confirmOpen.value = false
    snackbar.value = { show: true, text: 'Commande confirmée.', color: 'success' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitUnreachable(note: string) {
  if (!detail.value) return
  try {
    await store.markUnreachable(detail.value.id, note)
    unreachableOpen.value = false
    snackbar.value = { show: true, text: 'Commande marquée injoignable : elle est dans « À traiter ».', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

const trimmedNote = computed(() => noteText.value.trim())
const canAddNote = computed(
  () => Boolean(trimmedNote.value) && trimmedNote.value.length <= NOTE_MAX_LENGTH && !actionLoading.value,
)

async function submitNote() {
  if (!detail.value || !canAddNote.value) return
  try {
    await store.addNote(detail.value.id, trimmedNote.value)
    noteText.value = ''
    snackbar.value = { show: true, text: 'Note ajoutée.', color: 'success' }
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

async function submitDispatch(payload: DispatchOrderPayload) {
  if (!detail.value) return
  try {
    await store.dispatch(detail.value.id, payload)
    dispatchOpen.value = false
    snackbar.value = { show: true, text: 'Commande expédiée.', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitDelivery(payload: DeliverOrderPayload) {
  if (!detail.value) return
  try {
    await store.deliver(detail.value.id, payload)
    deliverOpen.value = false
    snackbar.value = { show: true, text: 'Commande marquée livrée.', color: 'success' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitFailure(reason: string) {
  if (!detail.value) return
  try {
    await store.markDeliveryFailed(detail.value.id, reason)
    failureOpen.value = false
    snackbar.value = { show: true, text: 'Échec de livraison enregistré.', color: 'warning' }
  } catch (cause) {
    snackbar.value = { show: true, text: orderActionErrorMessage(cause), color: 'error' }
  }
}

async function submitReturn(reason: string) {
  if (!detail.value) return
  try {
    await store.markReturned(detail.value.id, reason)
    returnOpen.value = false
    snackbar.value = { show: true, text: 'Commande passée en retour.', color: 'neutral' }
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

// La route réutilise le composant d'une commande à l'autre (préc/suiv) : on recharge
// le détail à chaque changement d'id, pas seulement au montage. En quittant la page,
// l'id disparaît de la route avant le démontage : rien à charger.
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id) void store.fetchDetail(id)
  },
  { immediate: true },
)

onMounted(() => {
  // Résolution des noms livreur/transporteur (l'API ne renvoie que les ids).
  void couriersStore.ensureLoaded()
  void carriersStore.ensureLoaded()
})
</script>

<template>
  <section class="order-detail">
    <div class="d-flex align-center justify-space-between ga-2 mb-3">
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-arrow-left"
        @click="goBack"
      >
        Commandes
      </v-btn>
      <div v-if="showNeighborNav" class="d-flex align-center ga-1">
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-chevron-left"
          :disabled="!previousOrderId || detailLoading"
          @click="goToOrder(previousOrderId)"
        >
          Précédente
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          append-icon="mdi-chevron-right"
          :disabled="!nextOrderId || detailLoading"
          @click="goToOrder(nextOrderId)"
        >
          Suivante
        </v-btn>
      </div>
    </div>

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
            <StatusChip
              v-if="hasOperationalStatus"
              :table="operationalStatusMeta"
              :value="detail.operationalStatus"
              size="default"
            />
            <v-chip v-if="detail.isCashOnDelivery" size="small" color="primary" variant="outlined">COD</v-chip>
          </div>
          <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis flex-wrap">
            <span>{{ formatNullable(detail.customerName) }}</span>
            <span>·</span>
            <span>{{ formatDateTime(detail.createdAt) }}</span>
            <template v-if="detail.orderStatusUrl">
              <span>·</span>
              <a :href="detail.orderStatusUrl" target="_blank" rel="noopener" class="text-primary d-inline-flex align-center ga-1">
                Voir sur Shopify <v-icon icon="mdi-open-in-new" size="14" />
              </a>
            </template>
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-wrap justify-end">
          <v-btn
            v-if="capabilities.canMarkFailed"
            variant="outlined"
            color="error"
            border="sm opacity-25"
            prepend-icon="mdi-alert-circle-outline"
            :loading="actionLoading"
            @click="failureOpen = true"
          >
            Échec
          </v-btn>
          <v-btn
            v-if="capabilities.canReturn"
            variant="outlined"
            color="neutral"
            border="sm opacity-25"
            prepend-icon="mdi-keyboard-return"
            :loading="actionLoading"
            @click="returnOpen = true"
          >
            Retour
          </v-btn>
          <v-btn
            v-if="capabilities.canDispatch"
            color="info"
            prepend-icon="mdi-truck-fast-outline"
            :loading="actionLoading"
            @click="dispatchOpen = true"
          >
            Expédier
          </v-btn>
          <v-btn
            v-if="capabilities.canDeliver"
            color="success"
            prepend-icon="mdi-check-circle-outline"
            :loading="actionLoading"
            @click="deliverOpen = true"
          >
            Marquer livrée
          </v-btn>
          <v-btn
            v-if="capabilities.canMarkUnreachable"
            variant="outlined"
            border="sm opacity-25"
            prepend-icon="mdi-phone-off-outline"
            :loading="actionLoading"
            @click="unreachableOpen = true"
          >
            Injoignable
          </v-btn>
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
            @click="confirmOpen = true"
          >
            Confirmer
          </v-btn>
        </div>
      </div>

      <!-- Numéro différent : tous les éléments pour décider -->
      <v-card
        v-if="isPhoneMismatch"
        border
        flat
        rounded="lg"
        color="error"
        variant="tonal"
        class="mb-5"
        data-test="phone-mismatch"
      >
        <v-card-text>
          <div class="d-flex align-center ga-2 mb-1">
            <v-icon icon="mdi-phone-alert-outline" size="20" />
            <span class="text-subtitle-1 font-weight-bold">Motif : Numéro différent</span>
          </div>
          <p class="text-body-2 mb-3">
            Un message est arrivé d’un autre numéro que celui de la commande. Ne confirmez qu’après avoir appelé
            le client au numéro de la commande.
          </p>
          <dl class="info-list">
            <div><dt>Numéro de la commande</dt><dd>{{ formatPhone(detail.customerPhoneE164) }}</dd></div>
            <div>
              <dt>Numéro qui a écrit</dt>
              <dd>{{ phoneMismatchSender.phone ? formatPhone(phoneMismatchSender.phone) : 'Numéro inconnu' }}</dd>
            </div>
            <div>
              <dt>Texte reçu</dt>
              <dd class="font-italic">
                <template v-if="detail.lastCustomerMessageText">« {{ detail.lastCustomerMessageText }} »</template>
                <template v-else>—</template>
              </dd>
            </div>
            <div>
              <dt>Reçu le</dt>
              <dd>{{ formatDateTime(detail.lastCustomerMessageAt ?? phoneMismatchSender.detectedAt) }}</dd>
            </div>
          </dl>
        </v-card-text>
      </v-card>

      <!-- Marqueur « autre numéro » conservé alors que le motif a changé -->
      <v-alert
        v-else-if="isCallRequired"
        type="warning"
        variant="tonal"
        density="compact"
        icon="mdi-phone-alert-outline"
        class="mb-5"
        data-test="phone-mismatch-reminder"
      >
        Message de confirmation reçu d’un autre numéro{{ detail.phoneMismatchAt ? ` le ${formatDateTime(detail.phoneMismatchAt)}` : '' }} :
        confirmez uniquement après avoir appelé le client.
      </v-alert>

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
                <div><dt>Adresse</dt><dd class="text-right">{{ formatNullable(detail.deliveryAddress) }}</dd></div>
                <div><dt>Créneau préféré</dt><dd>{{ formatNullable(detail.deliveryPreferredMoment) }}</dd></div>
                <div v-if="deliveryMapUrl">
                  <dt>Carte</dt>
                  <dd>
                    <a :href="deliveryMapUrl" target="_blank" rel="noopener" class="text-primary d-inline-flex align-center ga-1">
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
                <div class="amount-row"><span>Remise</span><span class="text-success">{{ formatAmount(detail.totalDiscounts, detail.currency) }}</span></div>
                <v-divider class="my-2" />
                <div class="amount-row text-subtitle-1 font-weight-bold"><span>Total</span><span>{{ formatAmount(detail.totalPrice, detail.currency) }}</span></div>
                <v-sheet
                  v-if="detail.totalOutstanding !== undefined && detail.totalOutstanding !== null"
                  rounded="lg"
                  color="attention"
                  variant="tonal"
                  class="d-flex align-center justify-space-between px-3 py-2 mt-3"
                >
                  <span class="text-body-2 font-weight-medium">Reste à collecter</span>
                  <span class="text-subtitle-1 font-weight-bold">{{ formatAmount(detail.totalOutstanding, detail.currency) }}</span>
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
                  {{ detail.isCashOnDelivery ? 'Paiement à la livraison' : formatNullable(paymentGatewayLabel) }}
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
              <div class="amount-row"><span class="text-medium-emphasis">Source</span><span>{{ formatNullable(detail.sourceName) }}</span></div>
            </v-card-text>
          </v-card>

          <!-- Conversion Meta (Chantier 5) : masquée tant que le backend n'envoie pas le statut. -->
          <v-card v-if="hasCapiStatus" border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-facebook" color="primary" size="20" /> Conversion Meta
            </v-card-title>
            <v-card-text>
              <StatusChip :table="capiPurchaseStatusMeta" :value="detail.capiPurchaseStatus" size="default" class="mb-3" />
              <dl class="info-list">
                <div v-if="detail.capiPurchaseSentAt"><dt>Envoyée le</dt><dd>{{ formatDateTime(detail.capiPurchaseSentAt) }}</dd></div>
                <div v-if="capiValueLabel"><dt>Valeur envoyée</dt><dd>{{ capiValueLabel }}</dd></div>
                <div v-if="capiSkipReason"><dt>Motif</dt><dd class="text-right">{{ capiSkipReason }}</dd></div>
              </dl>
              <v-alert
                v-if="detail.capiPurchaseStatus === 'failed'"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-3"
              >
                <span class="text-caption text-break">{{ hasText(detail.capiPurchaseError) ? detail.capiPurchaseError : 'Erreur inconnue' }}</span>
              </v-alert>
            </v-card-text>
          </v-card>

          <!-- Origine publicitaire (lecture seule) : masquée si aucun champ n'est renseigné. -->
          <v-card v-if="hasAdOrigin" border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-bullhorn-outline" color="primary" size="20" /> Origine publicitaire
            </v-card-title>
            <v-card-text>
              <v-chip
                v-if="hasText(detail.fbclid)"
                size="small"
                color="info"
                variant="tonal"
                prepend-icon="mdi-facebook"
                class="mb-3"
              >
                Clic Facebook
              </v-chip>
              <dl class="info-list">
                <div v-if="hasText(detail.campaignId)"><dt>Campagne</dt><dd class="text-right text-break">{{ detail.campaignId }}</dd></div>
                <div v-if="hasText(detail.adsetId)"><dt>Ensemble de pubs</dt><dd class="text-right text-break">{{ detail.adsetId }}</dd></div>
                <div v-if="hasText(detail.adId)"><dt>Pub</dt><dd class="text-right text-break">{{ detail.adId }}</dd></div>
                <div v-if="hasText(detail.utmSource)"><dt>Source UTM</dt><dd class="text-right text-break">{{ detail.utmSource }}</dd></div>
                <div v-if="hasText(detail.utmMedium)"><dt>Support UTM</dt><dd class="text-right text-break">{{ detail.utmMedium }}</dd></div>
              </dl>
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
                <div>
                  <dt>Source</dt>
                  <dd>{{ detail.confirmationSource ? lookupMeta(confirmationSourceMeta, detail.confirmationSource).label : formatNullable(null) }}</dd>
                </div>
                <div><dt>Date décision</dt><dd>{{ formatDateTime(detail.confirmedAt ?? detail.confirmationCancelledAt) }}</dd></div>
                <div><dt>Relances</dt><dd>{{ formatNullable(detail.reminderCount ?? 0) }}</dd></div>
                <div><dt>Dernière relance</dt><dd>{{ formatDateTime(detail.lastReminderAt) }}</dd></div>
                <div v-if="detail.confirmationCancelReason">
                  <dt>Motif d’annulation</dt>
                  <dd>{{ detail.confirmationCancelReason }}</dd>
                </div>
              </dl>
            </v-card-text>
          </v-card>

          <!-- Statut opérationnel -->
          <v-card v-if="hasOperationalStatus" border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-truck-fast-outline" color="primary" size="20" /> Statut opérationnel
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center ga-2 flex-wrap mb-3">
                <StatusChip :table="operationalStatusMeta" :value="detail.operationalStatus" size="default" />
                <StatusChip
                  v-if="detail.deliveryChannel"
                  :table="deliveryChannelMeta"
                  :value="detail.deliveryChannel"
                />
              </div>
              <dl class="info-grid">
                <div v-if="detail.assignedCourierId">
                  <dt>Livreur assigné</dt>
                  <dd>{{ formatNullable(assignedCourierName) }}</dd>
                </div>
                <div v-if="detail.assignedCarrierId">
                  <dt>Transporteur</dt>
                  <dd>{{ formatNullable(assignedCarrierName) }}</dd>
                </div>
                <div v-if="isCarrierChannel">
                  <dt>N° de suivi</dt>
                  <dd>{{ formatNullable(detail.carrierTrackingNumber) }}</dd>
                </div>
                <div><dt>Expédiée le</dt><dd>{{ formatDateTime(detail.dispatchedAt) }}</dd></div>
                <div><dt>Livrée le</dt><dd>{{ formatDateTime(detail.deliveredAt) }}</dd></div>
                <div><dt>Tentatives</dt><dd>{{ formatNullable(detail.deliveryAttempts ?? 0) }}</dd></div>
                <div v-if="detail.deliveryFailureReason">
                  <dt>Motif d’échec</dt>
                  <dd>{{ detail.deliveryFailureReason }}</dd>
                </div>
                <div v-if="detail.returnReason">
                  <dt>Motif de retour</dt>
                  <dd>{{ detail.returnReason }}</dd>
                </div>
              </dl>
            </v-card-text>
          </v-card>

          <!-- Encaissement COD -->
          <v-card v-if="hasCodInfo" border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-cash-register" color="primary" size="20" /> Encaissement COD
            </v-card-title>
            <v-card-text>
              <div class="amount-row"><span class="text-medium-emphasis">Attendu</span><span>{{ formatAmount(detail.codExpectedAmount, detail.currency) }}</span></div>
              <div class="amount-row"><span class="text-medium-emphasis">Encaissé</span><span>{{ formatAmount(detail.codCollectedAmount, detail.currency) }}</span></div>
              <div class="amount-row"><span class="text-medium-emphasis">Rémunération livreur</span><span class="text-error">− {{ formatAmount(detail.courierFeeAmount, detail.currency) }}</span></div>
              <div v-if="isCarrierChannel || detail.carrierFeeAmount" class="amount-row"><span class="text-medium-emphasis">Coût transporteur</span><span class="text-error">− {{ formatAmount(detail.carrierFeeAmount, detail.currency) }}</span></div>
              <v-divider class="my-2" />
              <div class="amount-row text-subtitle-1 font-weight-bold"><span>Net reversé</span><span>{{ formatAmount(detail.codNetRemitted, detail.currency) }}</span></div>
              <div class="d-flex align-center justify-space-between mt-3">
                <span class="text-body-2 text-medium-emphasis">Statut paiement</span>
                <StatusChip :table="codPaymentStatusMeta" :value="detail.codPaymentStatus" />
              </div>
              <div v-if="detail.collectedAt" class="text-caption text-medium-emphasis mt-2">
                Encaissé le {{ formatDateTime(detail.collectedAt) }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Notes libres (F16) : ajoutées à l'historique avec auteur et date. -->
          <v-card border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-note-text-outline" color="primary" size="20" /> Ajouter une note
            </v-card-title>
            <v-card-text>
              <v-textarea
                v-model="noteText"
                placeholder="Ex. : livrer chez son frère, rappeler après 18 h, nouvelle adresse…"
                rows="2"
                auto-grow
                hide-details="auto"
                counter
                :counter-value="(value: string) => (value ?? '').trim().length"
                :maxlength="NOTE_MAX_LENGTH"
                aria-label="Note sur la commande"
                @keydown.ctrl.enter="submitNote"
                @keydown.meta.enter="submitNote"
              />
              <div class="d-flex align-center justify-space-between ga-3 mt-3">
                <span class="text-caption text-medium-emphasis">Visible dans l’historique, avec votre nom et la date.</span>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  :disabled="!canAddNote"
                  :loading="actionLoading && Boolean(trimmedNote)"
                  @click="submitNote"
                >
                  Ajouter
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <!-- Timeline opérationnelle -->
          <v-card v-if="detailEvents.length" border flat rounded="lg">
            <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
              <v-icon icon="mdi-timeline-text-outline" color="primary" size="20" /> Historique
              <span class="text-caption text-medium-emphasis font-weight-regular">· {{ detailEvents.length }}</span>
            </v-card-title>
            <v-card-text>
              <v-timeline side="end" align="start" density="compact" truncate-line="both">
                <v-timeline-item
                  v-for="event in detailEvents"
                  :key="event.id"
                  :dot-color="lookupMeta(orderEventTypeMeta, event.type).color"
                  :icon="lookupMeta(orderEventTypeMeta, event.type).icon"
                  size="small"
                >
                  <div class="d-flex align-center ga-2 flex-wrap">
                    <span class="text-body-2 font-weight-medium">{{ lookupMeta(orderEventTypeMeta, event.type).label }}</span>
                    <v-spacer />
                    <span class="text-caption text-medium-emphasis">{{ formatDateTime(event.createdAt) }}</span>
                  </div>
                  <div v-if="event.actorName" class="text-caption text-medium-emphasis">
                    par {{ event.actorName }}
                  </div>
                  <div v-if="skipReasonLabel(event)" class="text-caption text-medium-emphasis">
                    Motif : {{ skipReasonLabel(event) }}
                  </div>
                  <div v-if="event.note" class="text-body-2 font-italic mt-1">« {{ event.note }} »</div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>

          <!-- Dernier message client -->
          <v-card
            v-if="detail.lastCustomerMessageText && !isPhoneMismatch"
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
              <p class="text-body-1 font-italic mb-1">« {{ detail.lastCustomerMessageText }} »</p>
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
                <v-chip size="small" variant="tonal" color="error" prepend-icon="mdi-alert-circle-outline">{{ failedMessageCount }} échec(s)</v-chip>
              </div>

              <p v-if="!detailMessages.length" class="text-body-2 text-medium-emphasis mb-0">
                Aucun message lié à cette commande.
              </p>

              <v-timeline v-else side="end" align="start" density="compact" truncate-line="both">
                <v-timeline-item
                  v-for="message in detailMessages"
                  :key="message.id"
                  :dot-color="isDeliberatelyNotSent(message) ? notSentMessageMeta.color : lookupMeta(messageStatusMeta, message.status).color"
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
                      <v-tooltip v-if="isDeliberatelyNotSent(message)" :text="message.errorMessage ?? message.errorCode" location="top">
                        <template #activator="{ props: tooltipProps }">
                          <v-chip
                            v-bind="tooltipProps"
                            size="x-small"
                            variant="tonal"
                            :color="notSentMessageMeta.color"
                            :prepend-icon="notSentMessageMeta.icon"
                            data-test="not-sent"
                          >
                            {{ notSentMessageMeta.label }}
                          </v-chip>
                        </template>
                      </v-tooltip>
                      <span
                        v-else
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
                      v-if="message.status === 'failed' && !isDeliberatelyNotSent(message)"
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

    <DispatchOrderDialog
      v-model="dispatchOpen"
      :order-name="detail?.shopifyOrderName"
      :submitting="actionLoading"
      @confirm="submitDispatch"
    />

    <DeliverOrderDialog
      v-model="deliverOpen"
      :order-name="detail?.shopifyOrderName"
      :order-total="detail?.totalPrice"
      :region-code="detail?.deliveryRegionCode"
      :channel="detail?.deliveryChannel"
      :has-courier="Boolean(detail?.assignedCourierId)"
      :carrier-id="detail?.assignedCarrierId"
      :shipping-price="detail?.shippingPrice"
      :currency="detail?.currency"
      :submitting="actionLoading"
      @confirm="submitDelivery"
    />

    <OrderReasonDialog
      v-model="failureOpen"
      title="Échec de livraison —"
      :order-name="detail?.shopifyOrderName"
      label="Motif de l’échec"
      icon="mdi-alert-circle-outline"
      color="error"
      confirm-text="Enregistrer l’échec"
      :reasons="['Client injoignable', 'Adresse introuvable', 'Client absent', 'Refus à la livraison', 'Autre']"
      :submitting="actionLoading"
      @confirm="submitFailure"
    />

    <ConfirmOrderDialog
      v-model="confirmOpen"
      :order-name="detail?.shopifyOrderName"
      :call-only="isCallRequired"
      :order-phone="detail?.customerPhoneE164 ? formatPhone(detail.customerPhoneE164) : undefined"
      :submitting="actionLoading"
      @confirm="submitConfirmation"
    />

    <OrderReasonDialog
      v-model="unreachableOpen"
      title="Client injoignable —"
      :order-name="detail?.shopifyOrderName"
      label="Ce qui s’est passé"
      icon="mdi-phone-off-outline"
      color="primary"
      confirm-text="Marquer injoignable"
      :reasons="['Ne répond pas', 'Messagerie', 'Numéro éteint', 'Ligne occupée']"
      :submitting="actionLoading"
      @confirm="submitUnreachable"
    />

    <OrderReasonDialog
      v-model="returnOpen"
      title="Retour de la commande —"
      :order-name="detail?.shopifyOrderName"
      label="Motif du retour"
      icon="mdi-keyboard-return"
      color="neutral"
      confirm-text="Confirmer le retour"
      :reasons="['Client a annulé', 'Produit refusé', 'Non livrable', 'Autre']"
      :submitting="actionLoading"
      @confirm="submitReturn"
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
