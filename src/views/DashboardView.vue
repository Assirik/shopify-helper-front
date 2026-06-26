<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { customerConfirmationStatusMeta } from '@/constants/status'
import { formatAmount, formatNullable, formatPercent } from '@/utils/format'
import StatusChip from '@/components/StatusChip.vue'
import type { OrderListItem } from '@/types/orders'

const store = useDashboardStore()
const router = useRouter()
const { stats, attentionPreview, confirmedPreview, loading, errorCode } = storeToRefs(store)

const today = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

// Tendance vs hier : masquée si on ne peut pas la calculer (hier = 0).
const trend = computed(() => {
  if (!stats.value || !stats.value.ordersYesterday) return null
  const delta = ((stats.value.ordersToday - stats.value.ordersYesterday) / stats.value.ordersYesterday) * 100
  const rounded = Math.round(delta)
  return {
    value: `${rounded > 0 ? '+' : ''}${rounded} %`,
    positive: rounded >= 0,
    yesterday: stats.value.ordersYesterday,
  }
})

const hasJobs = computed(
  () => stats.value?.jobsSucceeded !== undefined || stats.value?.jobsFailed !== undefined,
)

function goQueue() {
  void router.push({ name: 'a-traiter' })
}

function goOrders() {
  void router.push({
    name: 'commandes',
    query: { customerConfirmationStatus: 'confirmed' },
  })
}

function openOrder(id: string) {
  void router.push({ name: 'commande-detail', params: { id } })
}

function regionLabel(order: OrderListItem) {
  return formatNullable(order.deliveryRegion ?? order.shippingRegion)
}

onMounted(() => {
  void store.refresh()
})
</script>

<template>
  <section class="dashboard-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Dashboard</h1>
        <p class="text-body-2 text-medium-emphasis mb-0 text-capitalize">{{ today }}</p>
      </div>
      <v-btn
        prepend-icon="mdi-refresh"
        variant="outlined"
        border="sm opacity-25"
        rounded="lg"
        :loading="loading"
        size="large"
        @click="store.refresh"
      >
        <span class="text-uppercase">Actualiser</span>
      </v-btn>
    </header>

    <v-progress-linear v-if="loading && !stats" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="errorCode && !stats" type="error" variant="tonal" class="mb-4" role="alert">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>Les statistiques n’ont pas pu être chargées.</span>
        <v-btn variant="text" size="small" @click="store.refresh">Réessayer</v-btn>
      </div>
    </v-alert>

    <template v-if="stats">
      <!-- KPI grid -->
      <div class="kpi-grid">
        <!-- Commandes du jour -->
        <v-card border flat rounded="lg">
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
                <v-icon icon="mdi-shopping-outline" />
              </v-avatar>
              <span class="text-body-2 font-weight-medium text-medium-emphasis">Commandes du jour</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ formatNullable(stats.ordersToday) }}</div>
            <div v-if="trend" class="text-caption text-medium-emphasis mt-2 d-flex align-center ga-1">
              <span class="d-inline-flex align-center ga-1" :class="trend.positive ? 'text-success' : 'text-error'">
                <v-icon :icon="trend.positive ? 'mdi-trending-up' : 'mdi-trending-down'" size="16" />{{ trend.value }}
              </span>
              vs hier ({{ trend.yesterday }})
            </div>
          </v-card-text>
        </v-card>

        <!-- À traiter (highlight, clickable) -->
        <v-card
          border
          flat
          rounded="lg"
          color="attention"
          variant="tonal"
          class="kpi-clickable"
          role="button"
          tabindex="0"
          @click="goQueue"
          @keyup.enter="goQueue"
        >
          <v-card-text>
            <v-icon icon="mdi-arrow-top-right" size="20" class="kpi-corner" />
            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="attention" rounded="lg" size="40">
                <v-icon icon="mdi-alert-circle-outline" color="white" />
              </v-avatar>
              <span class="text-body-2 font-weight-bold text-attention">À traiter</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ formatNullable(stats.attention) }}</div>
            <div class="text-caption text-medium-emphasis mt-2">Réponses libres · SMS seul · n° invalides</div>
          </v-card-text>
        </v-card>

        <!-- Taux de confirmation -->
        <v-card border flat rounded="lg">
          <v-card-text class="d-flex align-center ga-4">
            <v-progress-circular
              :model-value="stats.confirmationRate"
              :size="84"
              :width="9"
              color="primary"
            >
              <span class="text-subtitle-1 font-weight-bold">{{ formatPercent(stats.confirmationRate) }}</span>
            </v-progress-circular>
            <div>
              <div class="text-body-2 font-weight-medium text-medium-emphasis">Taux de confirmation</div>
              <div class="text-caption text-medium-emphasis mt-1">Commandes confirmées sur l’ensemble traité</div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Échecs & fallback SMS -->
        <v-card border flat rounded="lg">
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="info" variant="tonal" rounded="lg" size="40">
                <v-icon icon="mdi-swap-horizontal" />
              </v-avatar>
              <span class="text-body-2 font-weight-medium text-medium-emphasis">Échecs & fallback SMS</span>
            </div>
            <div class="d-flex ga-6">
              <div>
                <div class="text-h5 font-weight-bold text-error">{{ formatNullable(stats.messageFailures) }}</div>
                <div class="text-caption text-medium-emphasis">messages en échec</div>
              </div>
              <v-divider vertical />
              <div>
                <div class="text-h5 font-weight-bold text-info">{{ formatNullable(stats.smsFallbacks) }}</div>
                <div class="text-caption text-medium-emphasis">bascules WhatsApp→SMS</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Jobs (uniquement si présents) -->
        <v-card v-if="hasJobs" border flat rounded="lg">
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="neutral" variant="tonal" rounded="lg" size="40">
                <v-icon icon="mdi-cog-sync-outline" />
              </v-avatar>
              <span class="text-body-2 font-weight-medium text-medium-emphasis">Santé de la file (jobs)</span>
            </div>
            <div class="d-flex ga-6 align-baseline">
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-check-circle-outline" color="success" size="18" />
                <span class="text-h5 font-weight-bold">{{ formatNullable(stats.jobsSucceeded) }}</span>
                <span class="text-caption text-medium-emphasis">réussis</span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-alert-circle-outline" color="error" size="18" />
                <span class="text-h5 font-weight-bold text-error">{{ formatNullable(stats.jobsFailed) }}</span>
                <span class="text-caption text-medium-emphasis">échoués</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Fausses commandes -->
        <v-card border flat rounded="lg">
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="error" variant="tonal" rounded="lg" size="40">
                <v-icon icon="mdi-shield-alert-outline" />
              </v-avatar>
              <span class="text-body-2 font-weight-medium text-medium-emphasis">Fausses commandes</span>
            </div>
            <div class="d-flex align-baseline ga-2">
              <div class="text-h4 font-weight-bold text-error">{{ formatNullable(stats.cancelledOrders) }}</div>
              <div class="text-caption text-medium-emphasis">annulées</div>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">Indicateur anti-fraude COD</div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Secondary zone -->
      <div class="secondary-grid mt-4">
        <!-- À traiter preview -->
        <v-card border flat rounded="lg" class="overflow-hidden">
          <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <v-icon icon="mdi-alert-circle-outline" color="attention" size="20" />
            File « À traiter »
            <v-spacer />
            <v-btn variant="text" size="small" color="primary" append-icon="mdi-arrow-right" @click="goQueue">
              Voir tout
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-list v-if="attentionPreview.length" lines="two" density="comfortable">
            <v-list-item
              v-for="order in attentionPreview"
              :key="order.id"
              :title="formatNullable(order.customerName)"
              :subtitle="formatNullable(order.customerPhone)"
              @click="openOrder(order.id)"
            >
              <template #prepend>
                <span class="font-weight-bold text-primary mr-2">{{ order.orderName }}</span>
              </template>
              <template #append>
                <StatusChip :table="customerConfirmationStatusMeta" :value="order.customerConfirmationStatus" :show-icon="false" />
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-body-2 text-medium-emphasis text-center py-8">
            Aucune commande à traiter pour le moment.
          </v-card-text>
        </v-card>

        <!-- Commandes à livrer -->
        <v-card border flat rounded="lg" class="overflow-hidden">
          <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <v-icon icon="mdi-truck-check-outline" color="success" size="20" />
            Commandes à livrer
            <v-spacer />
            <v-btn variant="text" size="small" color="primary" append-icon="mdi-arrow-right" @click="goOrders">
              Voir tout
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-list v-if="confirmedPreview.length" lines="two" density="comfortable">
            <v-list-item
              v-for="order in confirmedPreview"
              :key="order.id"
              :title="formatNullable(order.customerName)"
              @click="openOrder(order.id)"
            >
              <template #prepend>
                <span class="font-weight-bold text-primary mr-2">{{ order.shopifyOrderName }}</span>
              </template>
              <template #subtitle>
                <span class="d-inline-flex align-center ga-1">
                  <v-icon icon="mdi-map-marker-outline" size="14" />{{ regionLabel(order) }}
                </span>
              </template>
              <template #append>
                <div class="d-flex align-center ga-2">
                  <span class="font-weight-medium">{{ formatAmount(order.totalPrice, order.currency) }}</span>
                  <v-chip v-if="order.isCashOnDelivery" size="x-small" color="primary" variant="outlined">COD</v-chip>
                </div>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-body-2 text-medium-emphasis text-center py-8">
            Aucune commande confirmée à livrer.
          </v-card-text>
        </v-card>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-view {
  min-width: 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.kpi-clickable {
  cursor: pointer;
  position: relative;
}

.kpi-corner {
  position: absolute;
  top: 14px;
  right: 14px;
  color: rgb(var(--v-theme-attention));
}

.secondary-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1100px) {
  .secondary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
