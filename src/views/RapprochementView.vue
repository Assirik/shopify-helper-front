<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useReconciliationStore } from '@/stores/reconciliation'
import { useCouriersStore } from '@/stores/couriers'
import { codPaymentStatusMeta, deliveryChannelMeta, lookupMeta } from '@/constants/status'
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
const groups = computed(() => summary.value?.groups ?? [])
const hasData = computed(() => groups.value.length > 0)

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
  rows.push(['Livreur', 'Canal', 'Commandes', 'Encaissé', 'Rémunération', 'Net reversé'].map(csvCell).join(';'))
  summary.value.groups.forEach((group) => {
    rows.push(
      [
        group.courierName,
        lookupMeta(deliveryChannelMeta, group.channel).label,
        group.deliveredCount,
        group.totalCollected,
        group.totalCourierFee,
        group.totalNetRemitted,
      ]
        .map(csvCell)
        .join(';'),
    )
  })
  const t = summary.value.totals
  rows.push(['TOTAL', '', t.deliveredCount, t.totalCollected, t.totalCourierFee, t.totalNetRemitted].map(csvCell).join(';'))

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
          Cash dû en caisse par livreur, calculé sur les commandes livrées du jour.
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
          <div class="text-h5 font-weight-bold">{{ totals?.deliveredCount ?? 0 }}</div>
        </v-card>
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Total encaissé</div>
          <div class="text-h5 font-weight-bold">{{ formatAmount(totals?.totalCollected, 'XOF') }}</div>
        </v-card>
        <v-card border flat rounded="lg" class="pa-4">
          <div class="text-caption text-medium-emphasis">Total rémunérations</div>
          <div class="text-h5 font-weight-bold text-error">− {{ formatAmount(totals?.totalCourierFee, 'XOF') }}</div>
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

      <!-- Détail par livreur -->
      <v-card v-for="group in groups" :key="group.courierId ?? group.channel" border flat rounded="lg" class="mb-4">
        <v-card-item>
          <template #prepend>
            <v-avatar :color="lookupMeta(deliveryChannelMeta, group.channel).color" variant="tonal" rounded="lg" size="40">
              <v-icon :icon="lookupMeta(deliveryChannelMeta, group.channel).icon" />
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
            {{ group.courierName }}
            <StatusChip :table="deliveryChannelMeta" :value="group.channel" size="x-small" />
          </v-card-title>
          <v-card-subtitle>{{ group.deliveredCount }} commande(s) livrée(s)</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <div class="group-amounts">
            <div><span class="text-medium-emphasis">Encaissé</span><strong>{{ formatAmount(group.totalCollected, 'XOF') }}</strong></div>
            <div><span class="text-medium-emphasis">Rémunération</span><strong class="text-error">− {{ formatAmount(group.totalCourierFee, 'XOF') }}</strong></div>
            <div><span class="text-medium-emphasis">Net reversé</span><strong>{{ formatAmount(group.totalNetRemitted, 'XOF') }}</strong></div>
          </div>

          <template v-if="group.discrepancies.length">
            <v-divider class="my-3" />
            <div class="text-body-2 font-weight-medium d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-alert-outline" color="warning" size="18" />
              Écarts ({{ group.discrepancies.length }})
            </div>
            <div
              v-for="gap in group.discrepancies"
              :key="gap.orderId"
              class="discrepancy-row"
            >
              <span class="font-weight-medium text-primary">{{ gap.shopifyOrderName }}</span>
              <span class="text-caption text-medium-emphasis">
                {{ formatAmount(gap.codCollectedAmount, 'XOF') }} / {{ formatAmount(gap.codExpectedAmount, 'XOF') }}
              </span>
              <StatusChip :table="codPaymentStatusMeta" :value="gap.codPaymentStatus" size="x-small" />
            </div>
          </template>
        </v-card-text>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.reconciliation-view {
  min-width: 0;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 960px) {
  .totals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.group-amounts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
    grid-template-columns: 1fr;
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
