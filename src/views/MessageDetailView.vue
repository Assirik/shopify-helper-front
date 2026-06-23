<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMessagesStore } from '@/stores/messages'
import {
  channelMeta,
  messageStatusMeta,
  templatePurposeMeta,
  lookupMeta,
  formatProvider,
} from '@/constants/status'
import { formatDateTime, formatNullable } from '@/utils/format'
import { messageRetryErrorMessage } from '@/utils/orderErrors'
import StatusChip from '@/components/StatusChip.vue'

const route = useRoute()
const router = useRouter()
const store = useMessagesStore()
const { detail, detailLoading, detailErrorCode } = storeToRefs(store)

const messageId = computed(() => String(route.params.id))
const snackbar = ref({ show: false, text: '', color: 'neutral' })
const showRawJson = ref(false)

const retrying = computed(() => (detail.value ? store.mutatingIds.includes(detail.value.id) : false))
const isFailed = computed(() => detail.value?.status === 'failed')

const providerResponseText = computed(() => {
  const raw = detail.value?.providerResponse
  if (raw === null || raw === undefined || raw === '') return ''
  if (typeof raw === 'string') return raw
  try {
    return JSON.stringify(raw, null, 2)
  } catch {
    return String(raw)
  }
})

function goBack() {
  void router.push({ name: 'messages' })
}

function openOrder() {
  if (!detail.value?.orderId) return
  void router.push({ name: 'commande-detail', params: { id: detail.value.orderId } })
}

function openOrigin() {
  const origin = detail.value?.fallbackOf
  if (!origin?.id) return
  void router.push({ name: 'message-detail', params: { id: origin.id } })
}

async function retryMessage() {
  if (!detail.value) return
  try {
    await store.retry(detail.value.id)
    snackbar.value = { show: true, text: 'Nouvel envoi du message lancé.', color: 'info' }
  } catch (cause) {
    snackbar.value = { show: true, text: messageRetryErrorMessage(cause), color: 'error' }
  }
}

onMounted(() => {
  void store.fetchDetail(messageId.value)
})
</script>

<template>
  <section class="message-detail">
    <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" class="mb-3" @click="goBack">
      Messages
    </v-btn>

    <v-progress-linear v-if="detailLoading && !detail" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="detailErrorCode && !detail" type="error" variant="tonal" class="mb-4" role="alert">
      <div class="d-flex align-center justify-space-between ga-4">
        <span>Le message n’a pas pu être chargé.</span>
        <v-btn variant="text" size="small" @click="store.fetchDetail(messageId)">Réessayer</v-btn>
      </div>
    </v-alert>

    <div v-if="detail" class="content-column d-flex flex-column ga-4">
      <!-- Header -->
      <v-card border flat rounded="lg">
        <v-card-text>
          <div class="d-flex align-start justify-space-between ga-4 flex-wrap">
            <div class="min-w-0">
              <div class="d-flex align-center ga-3 flex-wrap mb-2">
                <h1 class="text-h6 font-weight-bold">Message {{ detail.id }}</h1>
                <StatusChip :table="messageStatusMeta" :value="detail.status" size="default" />
              </div>
              <div class="d-flex align-center ga-2 flex-wrap text-body-2 text-medium-emphasis">
                <span>Commande</span>
                <v-btn v-if="detail.orderId" variant="text" size="small" class="px-1 text-primary font-weight-bold" @click="openOrder">
                  {{ formatNullable(detail.orderName) }}
                </v-btn>
                <span v-else class="font-weight-bold">{{ formatNullable(detail.orderName) }}</span>
                <span>·</span>
                <StatusChip :table="channelMeta" :value="detail.channel" />
                <span class="text-body-2">{{ formatProvider(detail.provider) }}</span>
                <span>·</span>
                <span class="d-inline-flex align-center ga-1">
                  <v-icon icon="mdi-clock-outline" size="15" />{{ formatDateTime(detail.createdAt) }}
                </span>
              </div>
            </div>
            <v-btn
              v-if="isFailed"
              color="error"
              prepend-icon="mdi-replay"
              :loading="retrying"
              @click="retryMessage"
            >
              Réessayer
            </v-btn>
          </div>

          <!-- Fallback banner -->
          <v-alert
            v-if="detail.fallbackOf"
            type="info"
            variant="tonal"
            density="compact"
            color="neutral"
            class="mt-4"
            icon="mdi-subdirectory-arrow-right"
          >
            <span class="text-body-2">Ce SMS est le repli de</span>
            <v-btn variant="text" size="small" class="px-1 text-primary font-weight-bold" @click="openOrigin">
              {{ formatNullable(detail.fallbackOf.orderName ?? detail.fallbackOf.id) }}
            </v-btn>
            <span class="text-body-2">(WhatsApp en échec).</span>
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Envoi -->
      <v-card border flat rounded="lg">
        <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
          <v-icon icon="mdi-send-outline" color="primary" size="20" /> Envoi
        </v-card-title>
        <v-card-text>
          <dl class="info-list">
            <div>
              <dt>Template</dt>
              <dd class="mono">{{ formatNullable(detail.templateName) }}</dd>
            </div>
            <div>
              <dt>Objet</dt>
              <dd>
                <StatusChip v-if="detail.templatePurpose" :table="templatePurposeMeta" :value="detail.templatePurpose" :show-icon="false" />
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt>Payload du bouton</dt>
              <dd><code v-if="detail.buttonPayload" class="payload">{{ detail.buttonPayload }}</code><span v-else>—</span></dd>
            </div>
            <div>
              <dt>Tentatives</dt>
              <dd :class="(detail.attemptCount ?? 0) >= 3 ? 'text-error font-weight-bold' : ''">
                {{ formatNullable(detail.attemptCount) }}
              </dd>
            </div>
            <div>
              <dt>Provider Message ID</dt>
              <dd class="mono break-all">{{ formatNullable(detail.providerMessageId) }}</dd>
            </div>
          </dl>
        </v-card-text>
      </v-card>

      <!-- Réponse provider & erreurs -->
      <v-card border flat rounded="lg">
        <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
          <v-icon icon="mdi-cloud-sync-outline" color="primary" size="20" /> Réponse provider & erreurs
        </v-card-title>
        <v-card-text>
          <v-alert v-if="isFailed" type="error" variant="tonal" class="mb-4">
            <div class="d-flex align-center ga-2 mb-1">
              <span class="font-weight-bold">Échec de l’envoi</span>
              <code v-if="detail.errorCode" class="payload">{{ detail.errorCode }}</code>
            </div>
            <div class="text-body-2">{{ formatNullable(detail.errorMessage) }}</div>
          </v-alert>
          <v-alert v-else type="success" variant="tonal" density="compact" class="mb-4">
            Message accepté par le provider, sans erreur.
          </v-alert>

          <template v-if="providerResponseText">
            <v-btn
              variant="outlined"
              border="sm opacity-25"
              block
              class="justify-start"
              :prepend-icon="showRawJson ? 'mdi-chevron-down' : 'mdi-chevron-right'"
              @click="showRawJson = !showRawJson"
            >
              <span class="flex-grow-1 text-left">Réponse brute du provider</span>
              <span class="text-caption text-medium-emphasis mono">providerResponse</span>
            </v-btn>
            <v-expand-transition>
              <pre v-show="showRawJson" class="json-block mt-3">{{ providerResponseText }}</pre>
            </v-expand-transition>
          </template>
          <p v-else class="text-body-2 text-medium-emphasis mb-0">
            Aucune réponse provider enregistrée.
          </p>
        </v-card-text>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" role="status">
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>

<style scoped>
.message-detail {
  min-width: 0;
}

.content-column {
  max-width: 880px;
}

.min-w-0 {
  min-width: 0;
}

.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.info-list > div:last-child {
  border-bottom: none;
}
.info-list dt {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  font-size: 0.8125rem;
  flex: none;
}
.info-list dd {
  font-weight: 500;
  font-size: 0.8438rem;
  text-align: right;
}

.mono {
  font-family: 'Roboto Mono', ui-monospace, monospace;
}

.break-all {
  word-break: break-all;
}

.payload {
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.json-block {
  margin: 0;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-light, var(--v-theme-surface)));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: auto;
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
