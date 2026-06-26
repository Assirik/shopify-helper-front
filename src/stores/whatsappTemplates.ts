import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { whatsappService } from '@/services/whatsapp.service'
import { toApiFailure } from '@/services/errors'
import type { MetaTemplate, WhatsappTemplate } from '@/types/whatsapp'

export type TemplatesState = 'idle' | 'loading' | 'ready' | 'empty' | 'not_configured' | 'error'

const extractVariables = (body: string | undefined): string[] => {
  if (!body) return []
  return [...new Set(body.match(/\{\{[^{}]+\}\}/g) ?? [])]
}

const normalizeTemplate = (template: MetaTemplate): WhatsappTemplate => {
  const body = template.components?.find(component => component.type?.toUpperCase() === 'BODY')?.text
  const buttons = template.components
    ?.find(component => component.type?.toUpperCase() === 'BUTTONS')
    ?.buttons?.filter(button => Boolean(button.text))
    .map(button => ({ type: button.type, text: button.text as string }))

  return {
    id: template.id,
    name: template.name ?? 'template_sans_nom',
    language: template.language,
    category: template.category,
    status: template.status ?? '',
    body,
    variables: extractVariables(body),
    buttons: buttons ?? [],
  }
}

export const useWhatsappTemplatesStore = defineStore('whatsappTemplates', () => {
  const templates = ref<WhatsappTemplate[]>([])
  const state = ref<TemplatesState>('idle')
  const errorCode = ref('')

  const total = computed(() => templates.value.length)

  async function fetchTemplates() {
    state.value = 'loading'
    errorCode.value = ''
    try {
      const response = await whatsappService.templates()
      const metaTemplates = Array.isArray(response.data?.data) ? response.data.data : []
      templates.value = metaTemplates.map(normalizeTemplate)
      state.value = templates.value.length ? 'ready' : 'empty'
    } catch (cause) {
      const failure = toApiFailure(cause)
      errorCode.value = failure.code
      templates.value = []
      // Le provider WhatsApp n'est pas configuré → état dédié plutôt qu'erreur générique.
      state.value = failure.code === 'PROVIDER_NOT_CONFIGURED' ? 'not_configured' : 'error'
    }
  }

  return {
    templates,
    state,
    errorCode,
    total,
    fetchTemplates,
  }
})
