<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsappConfigStore } from '@/stores/whatsappConfig'
import { CONFIG_MAX_LENGTH, type ConfigFieldKey } from '@/types/whatsapp'
import { formatDateTime, formatNullable } from '@/utils/format'

const store = useWhatsappConfigStore()
const { fields, errors, updatedBy, updatedAt, loading, saving, loadErrorCode, dirty, canSave, errorCount } =
  storeToRefs(store)

const snackbar = ref({ show: false, text: '', color: 'neutral' })

interface FieldDef {
  key: ConfigFieldKey
  label: string
  icon: string
  iconColor: string
  placeholder: string
}

const shippingFields: FieldDef[] = [
  { key: 'shippingNote.dakar', label: 'Dakar', icon: 'mdi-crosshairs-gps', iconColor: 'primary', placeholder: 'Ex : Livraison à domicile sous 24 h à Dakar.' },
  { key: 'shippingNote.nonDakar', label: 'Hors Dakar', icon: 'mdi-compass-outline', iconColor: 'neutral', placeholder: 'Ex : Livraison en région sous 48 à 72 h.' },
]
const paymentFields: FieldDef[] = [
  { key: 'paymentMethod.dakar', label: 'Dakar', icon: 'mdi-crosshairs-gps', iconColor: 'primary', placeholder: 'Ex : Paiement en espèces à la livraison.' },
  { key: 'paymentMethod.nonDakar', label: 'Hors Dakar', icon: 'mdi-compass-outline', iconColor: 'neutral', placeholder: 'Ex : Paiement à la livraison via le transporteur.' },
]

function counterColor(key: ConfigFieldKey) {
  const length = fields.value[key].length
  if (length > CONFIG_MAX_LENGTH) return 'text-error'
  if (length > CONFIG_MAX_LENGTH - 20) return 'text-warning'
  return 'text-medium-emphasis'
}

function cancel() {
  store.discardChanges()
  snackbar.value = { show: true, text: 'Modifications annulées.', color: 'neutral' }
}

async function save() {
  try {
    const ok = await store.save()
    if (ok) snackbar.value = { show: true, text: 'Configuration enregistrée.', color: 'success' }
  } catch {
    snackbar.value = { show: true, text: 'Corrigez les champs en erreur avant d’enregistrer.', color: 'error' }
  }
}

onMounted(() => {
  void store.fetchConfig()
})
</script>

<template>
  <section class="config-view">
    <div class="config-content">
      <!-- Page header -->
      <div class="d-flex align-start ga-3 mb-2">
        <v-avatar color="primary" variant="tonal" rounded="lg" size="44">
          <v-icon icon="mdi-tune" />
        </v-avatar>
        <div>
          <h1 class="text-h5 font-weight-bold mb-1">Configuration des variables de message</h1>
          <p class="text-body-2 text-medium-emphasis mb-1" style="max-width: 680px">
            Ces textes personnalisent les templates <strong>Demande de confirmation</strong> et
            <strong>Relance</strong>. La variante est choisie selon la région figée sur la commande
            (Dakar / hors Dakar).
          </p>
          <div v-if="updatedBy || updatedAt" class="text-caption text-medium-emphasis d-flex align-center ga-1">
            <v-icon icon="mdi-history" size="15" />
            Modifié par <strong>{{ formatNullable(updatedBy) }}</strong> le {{ formatDateTime(updatedAt) }}
          </div>
        </div>
      </div>

      <v-progress-linear v-if="loading" indeterminate color="primary" class="my-4" />

      <v-alert v-if="loadErrorCode" type="error" variant="tonal" class="my-4" role="alert">
        <div class="d-flex align-center justify-space-between ga-4">
          <span>La configuration n’a pas pu être chargée.</span>
          <v-btn variant="text" size="small" @click="store.fetchConfig">Réessayer</v-btn>
        </div>
      </v-alert>

      <!-- shippingNote -->
      <v-card border flat rounded="lg" class="mt-4">
        <v-card-item>
          <template #prepend>
            <v-icon icon="mdi-truck-outline" color="primary" />
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">Note de livraison</v-card-title>
          <v-card-subtitle class="mono">shippingNote</v-card-subtitle>
          <template #append>
            <span class="text-caption font-italic text-medium-emphasis d-none d-md-inline">
              Vide = titre de livraison Shopify, sinon « Livraison standard »
            </span>
          </template>
        </v-card-item>
        <v-card-text>
          <div class="fields-grid">
            <div v-for="field in shippingFields" :key="field.key">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon :icon="field.icon" :color="field.iconColor" size="18" />
                <span class="text-body-2 font-weight-medium">{{ field.label }}</span>
              </div>
              <v-textarea
                :model-value="fields[field.key]"
                :placeholder="field.placeholder"
                :error-messages="errors[field.key]"
                rows="3"
                auto-grow
                :counter="CONFIG_MAX_LENGTH"
                @update:model-value="(value: string) => store.setField(field.key, value)"
              />
              <div class="d-flex align-center justify-space-between mt-1">
                <v-btn
                  variant="text"
                  size="x-small"
                  prepend-icon="mdi-restart"
                  :disabled="!fields[field.key]"
                  @click="store.resetField(field.key)"
                >
                  Réinitialiser
                </v-btn>
                <span class="text-caption font-weight-medium" :class="counterColor(field.key)">
                  {{ fields[field.key].length }}/{{ CONFIG_MAX_LENGTH }}
                </span>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- paymentMethod -->
      <v-card border flat rounded="lg" class="mt-4">
        <v-card-item>
          <template #prepend>
            <v-icon icon="mdi-cash-multiple" color="primary" />
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">Mode de paiement</v-card-title>
          <v-card-subtitle class="mono">paymentMethod</v-card-subtitle>
          <template #append>
            <span class="text-caption font-italic text-medium-emphasis d-none d-md-inline">
              Vide = moyen de paiement réel de la commande
            </span>
          </template>
        </v-card-item>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4" icon="mdi-alert-outline">
            Ce texte ne s’applique qu’aux commandes <strong>COD</strong>. Les commandes non-COD
            gardent leur moyen de paiement réel.
          </v-alert>
          <div class="fields-grid">
            <div v-for="field in paymentFields" :key="field.key">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon :icon="field.icon" :color="field.iconColor" size="18" />
                <span class="text-body-2 font-weight-medium">{{ field.label }}</span>
              </div>
              <v-textarea
                :model-value="fields[field.key]"
                :placeholder="field.placeholder"
                :error-messages="errors[field.key]"
                rows="3"
                auto-grow
                :counter="CONFIG_MAX_LENGTH"
                @update:model-value="(value: string) => store.setField(field.key, value)"
              />
              <div class="d-flex align-center justify-space-between mt-1">
                <v-btn
                  variant="text"
                  size="x-small"
                  prepend-icon="mdi-restart"
                  :disabled="!fields[field.key]"
                  @click="store.resetField(field.key)"
                >
                  Réinitialiser
                </v-btn>
                <span class="text-caption font-weight-medium" :class="counterColor(field.key)">
                  {{ fields[field.key].length }}/{{ CONFIG_MAX_LENGTH }}
                </span>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Sticky footer -->
    <v-slide-y-reverse-transition>
      <v-sheet v-if="dirty" border class="config-footer d-flex align-center ga-3 px-6 py-3">
        <span v-if="errorCount" class="text-body-2 text-error d-flex align-center ga-1">
          <v-icon icon="mdi-alert-circle-outline" size="16" /> {{ errorCount }} champ(s) en erreur
        </span>
        <span v-else class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
          <v-icon icon="mdi-circle" size="10" color="warning" /> Modifications non enregistrées
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
.config-view {
  min-width: 0;
}

.config-content {
  max-width: 920px;
  margin: 0 auto;
  padding-bottom: 16px;
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

@media (max-width: 960px) {
  .fields-grid {
    grid-template-columns: 1fr;
  }
}

.mono {
  font-family: 'Roboto Mono', ui-monospace, monospace;
}

.config-footer {
  position: sticky;
  bottom: 0;
  z-index: 4;
  margin: 16px -24px -24px;
  background: rgb(var(--v-theme-surface));
}
</style>
