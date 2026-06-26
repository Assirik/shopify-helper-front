<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsappTemplatesStore } from '@/stores/whatsappTemplates'
import { templateStatusMeta } from '@/constants/status'
import { formatNullable } from '@/utils/format'
import StatusChip from '@/components/StatusChip.vue'

const store = useWhatsappTemplatesStore()
const { templates, state, total } = storeToRefs(store)

onMounted(() => {
  void store.fetchTemplates()
})
</script>

<template>
  <section class="templates-view">
    <header class="d-flex align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h5 font-weight-bold">Templates WhatsApp</h1>
          <v-chip v-if="state === 'ready'" size="small" variant="tonal" color="neutral">{{ total }}</v-chip>
        </div>
        <div class="d-flex align-center ga-2">
          <p class="text-body-2 text-medium-emphasis mb-0">Catalogue des templates validés chez Meta</p>
          <v-chip size="x-small" variant="tonal" color="neutral" prepend-icon="mdi-lock-outline">Lecture seule</v-chip>
        </div>
      </div>
      <v-btn
        prepend-icon="mdi-sync"
        variant="outlined"
        border="sm opacity-25"
        rounded="lg"
        :loading="state === 'loading'"
        size="large"
        @click="store.fetchTemplates"
      >
        <span class="text-uppercase">Actualiser</span>
      </v-btn>
    </header>

    <!-- Loading -->
    <div v-if="state === 'loading'">
      <v-row>
        <v-col v-for="n in 4" :key="n" cols="12" md="6">
          <v-skeleton-loader type="article, actions" />
        </v-col>
      </v-row>
    </div>

    <!-- Provider non configuré -->
    <v-sheet v-else-if="state === 'not_configured'" border rounded="lg" class="state-block">
      <v-icon icon="mdi-cog-off-outline" color="info" size="56" class="mb-3" />
      <p class="text-h6 font-weight-bold mb-1">Configuration Meta incomplète</p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Renseignez le Business Account WhatsApp pour lister les templates approuvés.
      </p>
    </v-sheet>

    <!-- Erreur provider -->
    <v-sheet v-else-if="state === 'error'" border rounded="lg" class="state-block">
      <v-icon icon="mdi-cloud-off-outline" color="error" size="56" class="mb-3" />
      <p class="text-h6 font-weight-bold mb-1">Impossible de récupérer les templates depuis Meta</p>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Le service Meta a renvoyé une erreur. Réessayez dans quelques instants.
      </p>
      <v-btn color="error" prepend-icon="mdi-replay" @click="store.fetchTemplates">Réessayer</v-btn>
    </v-sheet>

    <!-- Vide -->
    <v-sheet v-else-if="state === 'empty'" border rounded="lg" class="state-block">
      <v-icon icon="mdi-inbox-outline" color="neutral" size="56" class="mb-3" />
      <p class="text-subtitle-1 font-weight-medium mb-1">Aucun template trouvé</p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Aucun template n’est encore enregistré pour ce Business Account WhatsApp.
      </p>
    </v-sheet>

    <!-- Catalogue -->
    <div v-else class="templates-grid">
      <v-card v-for="template in templates" :key="template.name" border flat rounded="lg" class="d-flex flex-column">
        <v-card-item>
          <v-card-title class="mono text-body-1 font-weight-bold text-break">{{ template.name }}</v-card-title>
          <template #append>
            <StatusChip :table="templateStatusMeta" :value="template.status" />
          </template>
          <div class="d-flex flex-wrap ga-2 mt-2">
            <v-chip size="x-small" variant="outlined" prepend-icon="mdi-translate">{{ formatNullable(template.language) }}</v-chip>
            <v-chip v-if="template.category" size="x-small" variant="outlined">{{ template.category }}</v-chip>
          </div>
        </v-card-item>

        <v-card-text class="flex-grow-1">
          <div class="text-overline text-medium-emphasis mb-2">Aperçu</div>
          <div class="bubble">
            <span class="bubble-body">{{ formatNullable(template.body) }}</span>
            <template v-if="template.buttons && template.buttons.length">
              <v-divider class="my-2" />
              <div
                v-for="(button, index) in template.buttons"
                :key="index"
                class="text-center text-success font-weight-medium d-flex align-center justify-center ga-1"
              >
                <v-icon icon="mdi-reply-outline" size="16" />{{ button.text }}
              </div>
            </template>
          </div>
          <div v-if="template.variables && template.variables.length" class="d-flex align-start ga-2 mt-3 text-caption text-medium-emphasis">
            <v-icon icon="mdi-code-braces" size="15" class="mt-1" />
            <span><strong>Variables :</strong> {{ template.variables.join(' · ') }}</span>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.templates-view {
  min-width: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 18px;
}

@media (max-width: 900px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
}

.state-block {
  padding: 60px 24px;
  text-align: center;
  max-width: 560px;
  margin: 40px auto;
}

.mono {
  font-family: 'Roboto Mono', ui-monospace, monospace;
}

.text-break {
  word-break: break-all;
}

.bubble {
  background: rgba(var(--v-theme-success), 0.1);
  border-radius: 4px 12px 12px 12px;
  padding: 12px 14px;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.bubble-body {
  white-space: pre-line;
}
</style>
