<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useReconciliationStore } from '@/stores/reconciliation'
import { useCouriersStore } from '@/stores/couriers'
import { codPaymentStatusMeta } from '@/constants/status'
import { formatAmount, formatDate } from '@/utils/format'
import StatusChip from '@/components/StatusChip.vue'
import ErrorState from '@/components/ErrorState.vue'

const store = useReconciliationStore()
const couriersStore = useCouriersStore()
const { summary, filters, loading, errorCode } = storeToRefs(store)
const { activeCouriers } = storeToRefs(couriersStore)

const courierOptions = computed(() => [
  { value: null as string | null, title: 'Tous les livreurs' },
  ...activeCouriers.value.map((courier) => ({ value: courier.id, title: courier.name })),
])

const totals = computed(() => summary.value?.totals ?? null)
const couriers = computed(() => summary.value?.couriers ?? [])
const carriers = computed(() => summary.value?.carriers ?? [])
const hasData = computed(() => couriers.value.length > 0 || carriers.value.length > 0)

function applyDate(value: string) {
  void store.applyFilters({ date: value })
}
function applyCourier(value: string | null) {
  void store.applyFilters({ courierId: value })
}

/** Échappe un champ pour le CSV (séparateur point-virgule, FR-friendly). */
function csvCell(value: string | number): string {
  const text = String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportCsv() {
  if (!summary.value) return
  const rows: string[] = []

  // Ledger caisse (par livreur).
  rows.push('# Caisse par livreur')
  rows.push(
    ['Livreur', 'Commandes', 'Encaissé', 'Rémunérations', 'Coût transporteur', 'Net dû caisse']
      .map(csvCell)
      .join(';'),
  )
  summary.value.couriers.forEach((ledger) => {
    rows.push(
      [
        ledger.courierName,
        ledger.deliveredOrders,
        ledger.totalCollected,
        ledger.totalCourierFees,
        ledger.totalCarrierFees,
        ledger.totalNetRemitted,
      ]
        .map(csvCell)
        .join(';'),
    )
  })
  const t = summary.value.totals
  rows.push(
    ['TOTAL', t.deliveredOrders, t.totalCollected, t.totalCourierFees, t.totalCarrierFees, t.totalNetRemitted]
      .map(csvCell)
      .join(';'),
  )

  // Ledger dettes (par transporteur).
  rows.push('')
  rows.push('# Dû aux transporteurs')
  rows.push(['Transporteur', 'Commandes', 'Montant dû'].map(csvCell).join(';'))
  summary.value.carriers.forEach((ledger) => {
    rows.push([ledger.carrierName, ledger.deliveredOrders, ledger.totalDue].map(csvCell).join(';'))
  })

  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rapprochement-${summary.value.date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  void couriersStore.ensureLoaded()
  void store.fetchSummary()
})
</script>

<template>
  <section class="reconciliation-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Rapprochement de caisse</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Cash dû en caisse par livreur et dettes aux transporteurs, sur les commandes
          livrées du jour.
        </p>
      </div>
      <v-btn
        prepend-icon="mdi-download-outline"
        variant="outlined"
        border="sm opacity-25"
        rounded="lg"
        size="large"
        :disabled="!hasData"
        @click="exportCsv"
      >
        Exporter le récap
      </v-btn>
    </header>

    <v-card border flat rounded="lg" class="pa-4 mb-4">
      <div class="d-flex flex-wrap ga-3 align-center">
        <v-text-field
          :model-value="filters.date"
          label="Date de livraison"
          type="date"
          prepend-inner-icon="mdi-calendar-outline"
          hide-details
          style="max-width: 220px"
          @update:model-value="applyDate"
        />
        <v-select
          :model-value="filters.courierId"
          label="Livreur"
          :items="courierOptions"
          prepend-inner-icon="mdi-moped-outline"
          hide-details
          style="max-width: 260px"
          @update:model-value="applyCourier"
        />
        <v-spacer />
        <v-btn prepend-icon="mdi-refresh" variant="text" :loading="loading" @click="store.fetchSummary">
          Actualiser
        </v-btn>
      </div>
    </v-card>

    <v-progress-linear v-if="loading && !summary" indeterminate color="primary" class="mb-3" />

    <ErrorState v-if="errorCode" :loading="loading" class="mb-4" @retry="store.fetchSummary" />

    <template v-else-if="summary">
      <!-- Totaux -->
      <div class="totals-grid mb-4">
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Commandes livrées</div>
          <div class="text-h5 font-weight-bold">{{ totals?.deliveredOrders ?? 0 }}</div>
        </v-card>
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Total encaissé</div>
          <div class="text-h5 font-weight-bold">{{ formatAmount(totals?.totalCollected, 'XOF') }}</div>
        </v-card>
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Rémunérations livreurs</div>
          <div class="text-h5 font-weight-bold text-error">− {{ formatAmount(totals?.totalCourierFees, 'XOF') }}</div>
        </v-card>
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Coûts transporteurs</div>
          <div class="text-h5 font-weight-bold text-error">− {{ formatAmount(totals?.totalCarrierFees, 'XOF') }}</div>
        </v-card>
        <v-card border flat rounded="lg" color="primary" variant="tonal" class="pa-4">
          <div class="text-caption">Net dû en caisse</div>
          <div class="text-h5 font-weight-bold">{{ formatAmount(totals?.totalNetRemitted, 'XOF') }}</div>
        </v-card>
      </div>

      <v-sheet v-if="!hasData" border rounded="lg" class="pa-10 text-center">
        <v-icon icon="mdi-cash-register" color="neutral" size="42" class="mb-3" />
        <p class="text-subtitle-1 font-weight-medium mb-1">Aucune livraison ce jour</p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Aucune commande livrée pour {{ formatDate(filters.date) }} avec ces filtres.
        </p>
      </v-sheet>

      <!-- Ledger CAISSE par livreur -->
      <template v-if="couriers.length">
        <h2 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center ga-2">
          <v-icon icon="mdi-moped-outline" color="primary" size="20" /> Caisse par livreur
        </h2>
        <v-card v-for="ledger in couriers" :key="ledger.courierId ?? 'unassigned'" border flat rounded="lg" class="mb-4">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">{{ ledger.courierName }}</v-card-title>
            <v-card-subtitle>{{ ledger.deliveredOrders }} commande(s) livrée(s)</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <div class="group-amounts">
              <div><span class="text-medium-emphasis">Encaissé</span><strong>{{ formatAmount(ledger.totalCollected, 'XOF') }}</strong></div>
              <div><span class="text-medium-emphasis">Rémunération</span><strong class="text-error">− {{ formatAmount(ledger.totalCourierFees, 'XOF') }}</strong></div>
              <div><span class="text-medium-emphasis">Coût transporteur</span><strong class="text-error">− {{ formatAmount(ledger.totalCarrierFees, 'XOF') }}</strong></div>
              <div><span class="text-medium-emphasis">Net dû caisse</span><strong>{{ formatAmount(ledger.totalNetRemitted, 'XOF') }}</strong></div>
            </div>

            <template v-if="ledger.discrepancies.length">
              <v-divider class="my-3" />
              <div class="text-body-2 font-weight-medium d-flex align-center ga-2 mb-2">
                <v-icon icon="mdi-alert-outline" color="warning" size="18" />
                Écarts ({{ ledger.discrepancies.length }})
              </div>
              <div v-for="gap in ledger.discrepancies" :key="gap.orderId" class="discrepancy-row">
                <span class="font-weight-medium text-primary">{{ gap.orderName }}</span>
                <span class="text-caption text-medium-emphasis">
                  {{ formatAmount(gap.collectedAmount, 'XOF') }} / {{ formatAmount(gap.expectedAmount, 'XOF') }}
                </span>
                <StatusChip :table="codPaymentStatusMeta" :value="gap.codPaymentStatus" size="x-small" />
              </div>
            </template>
          </v-card-text>
        </v-card>
      </template>

      <!-- Ledger DETTES transporteurs -->
      <template v-if="carriers.length">
        <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2 d-flex align-center ga-2">
          <v-icon icon="mdi-truck-outline" color="primary" size="20" /> Dû aux transporteurs
        </h2>
        <v-card border flat rounded="lg" class="overflow-hidden">
          <v-list lines="one">
            <template v-for="(ledger, index) in carriers" :key="ledger.carrierId ?? 'unknown'">
              <v-divider v-if="index > 0" />
              <v-list-item>
                <template #prepend>
                  <v-avatar color="info" variant="tonal" rounded="lg" size="36">
                    <v-icon icon="mdi-truck-delivery-outline" size="20" />
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">{{ ledger.carrierName }}</v-list-item-title>
                <v-list-item-subtitle>{{ ledger.deliveredOrders }} commande(s)</v-list-item-subtitle>
                <template #append>
                  <span class="text-subtitle-1 font-weight-bold">{{ formatAmount(ledger.totalDue, 'XOF') }}</span>
                </template>
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </template>
    </template>
  </section>
</template>

<style scoped>
.reconciliation-view {
  min-width: 0;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1200px) {
  .totals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.group-amounts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.group-amounts > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.875rem;
}

@media (max-width: 700px) {
  .group-amounts {
    grid-template-columns: 1fr 1fr;
  }
}

.discrepancy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.discrepancy-row > span:nth-child(2) {
  margin-left: auto;
}
</style>
