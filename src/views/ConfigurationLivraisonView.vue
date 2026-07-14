<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeliveryFeesStore } from '@/stores/deliveryFees'
import { SENEGAL_REGIONS } from '@/constants/senegalRegions'
import { formatDateTime, formatUpdatedBy } from '@/utils/format'

const store = useDeliveryFeesStore()
const {
  defaultFee,
  regionFees,
  loading,
  saving,
  loadErrorCode,
  dirty,
  config,
  defaultFeeInvalid,
  invalidRegionCodes,
  canSave,
} = storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })

function cancel() {
  store.discardChanges()
  snackbar.value = { show: true, text: 'Modifications annulées.', color: 'neutral' }
}

async function save() {
  try {
    const ok = await store.save()
    if (ok) snackbar.value = { show: true, text: 'Barème enregistré.', color: 'success' }
  } catch {
    snackbar.value = { show: true, text: 'L’enregistrement du barème a échoué.', color: 'error' }
  }
}

onMounted(() => {
  void store.fetchConfig()
})
</script>

<template>
  <section class="fees-view">
    <div class="fees-content">
      <div class="d-flex align-start ga-3 mb-2">
        <v-avatar color="primary" variant="tonal" rounded="lg" size="44">
          <v-icon icon="mdi-map-marker-distance" />
        </v-avatar>
        <div>
          <h1 class="text-h5 font-weight-bold mb-1">Configuration du barème de livraison</h1>
          <p class="text-body-2 text-medium-emphasis mb-1" style="max-width: 680px">
            La rémunération livreur est un <strong>coût interne</strong> prélevé sur l’encaissement COD
            (la livraison reste gratuite pour le client). Un montant par région prime sur le défaut
            global ; il reste modifiable au moment de marquer une commande « livrée ».
          </p>
          <div v-if="config?.updatedAt" class="text-caption text-medium-emphasis d-flex align-center ga-1">
            <v-icon icon="mdi-history" size="15" />
            Modifié par <strong>{{ formatUpdatedBy(config?.updatedBy) }}</strong> le {{ formatDateTime(config?.updatedAt) }}
          </div>
        </div>
      </div>

      <v-progress-linear v-if="loading" indeterminate color="primary" class="my-4" />

      <v-alert v-if="loadErrorCode" type="error" variant="tonal" class="my-4" role="alert">
        <div class="d-flex align-center justify-space-between ga-4">
          <span>Le barème n’a pas pu être chargé.</span>
          <v-btn variant="text" size="small" @click="store.fetchConfig">Réessayer</v-btn>
        </div>
      </v-alert>

      <!-- Défaut global -->
      <v-card border flat rounded="lg" class="mt-4">
        <v-card-item>
          <template #prepend>
            <v-icon icon="mdi-earth" color="primary" />
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">Défaut global</v-card-title>
          <v-card-subtitle>Repli appliqué aux régions sans montant spécifique.</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <v-text-field
            v-model="defaultFee"
            label="Rémunération par défaut"
            type="number"
            min="0"
            prepend-inner-icon="mdi-cash"
            suffix="FCFA"
            :error="defaultFeeInvalid"
            :error-messages="defaultFeeInvalid ? 'Montant requis (nombre positif ou nul).' : undefined"
            hide-details="auto"
            style="max-width: 280px"
          />
        </v-card-text>
      </v-card>

      <!-- Montants par région -->
      <v-card border flat rounded="lg" class="mt-4">
        <v-card-item>
          <template #prepend>
            <v-icon icon="mdi-map-marker-multiple-outline" color="primary" />
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">Montants par région</v-card-title>
          <v-card-subtitle>Laisser vide pour utiliser le défaut global.</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <div class="regions-grid">
            <div v-for="region in SENEGAL_REGIONS" :key="region.code" class="region-row">
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-map-marker-outline" size="18" class="text-medium-emphasis" />
                <span class="text-body-2 font-weight-medium">{{ region.label }}</span>
                <span class="text-caption text-medium-emphasis">{{ region.code }}</span>
              </div>
              <v-text-field
                :model-value="regionFees[region.code] ?? ''"
                type="number"
                min="0"
                density="compact"
                placeholder="Défaut"
                suffix="FCFA"
                :error="invalidRegionCodes.includes(region.code)"
                :error-messages="invalidRegionCodes.includes(region.code) ? 'Montant invalide.' : undefined"
                hide-details="auto"
                clearable
                style="max-width: 200px"
                @update:model-value="(value: string) => store.setRegionFee(region.code, value ?? '')"
              />
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-slide-y-reverse-transition>
      <v-sheet v-if="dirty" border class="fees-footer d-flex align-center ga-3 px-6 py-3">
        <span
          v-if="canSave"
          class="text-body-2 text-medium-emphasis d-flex align-center ga-1"
        >
          <v-icon icon="mdi-circle" size="10" color="warning" /> Modifications non enregistrées
        </span>
        <span v-else class="text-body-2 text-error d-flex align-center ga-1">
          <v-icon icon="mdi-alert-circle-outline" size="16" /> Corrigez les montants invalides avant d’enregistrer.
        </span>
        <v-spacer />
        <v-btn variant="outlined" border="sm opacity-25" :disabled="saving" @click="cancel">Annuler</v-btn>
        <v-btn color="primary" prepend-icon="mdi-content-save-outline" :loading="saving" :disabled="!canSave" @click="save">
          Enregistrer
        </v-btn>
      </v-sheet>
    </v-slide-y-reverse-transition>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>

<style scoped>
.fees-view {
  min-width: 0;
}

.fees-content {
  max-width: 920px;
  margin: 0 auto;
  padding-bottom: 16px;
}

.regions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 28px;
}

@media (max-width: 960px) {
  .regions-grid {
    grid-template-columns: 1fr;
  }
}

.region-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fees-footer {
  position: sticky;
  bottom: 0;
  z-index: 4;
  margin: 16px -24px -24px;
  background: rgb(var(--v-theme-surface));
}
</style>
