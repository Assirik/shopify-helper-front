import type { ThemeDefinition } from 'vuetify'

/**
 * Couleurs sémantiques de statut, communes à toutes les palettes.
 * (cf. HELPDESK_DESIGN_PROMPT.md — section 3)
 */
const semantic = {
  success: '#16A34A', // confirmé / job réussi
  warning: '#D97706', // en attente / pending
  error: '#DC2626', // échec / annulé
  info: '#2563EB', // info / SMS
}

export interface PaletteMeta {
  /** Clé technique = nom du thème Vuetify */
  key: string
  /** Libellé affiché dans le menu rapide */
  label: string
  /** true si la palette est sombre */
  dark: boolean
}

/** Métadonnées des palettes, pour alimenter le sélecteur dans la top bar. */
export const palettes: PaletteMeta[] = [
  { key: 'ardoiseIndigo', label: 'Ardoise & Indigo', dark: false },
  { key: 'emeraudeSobre', label: 'Émeraude sobre', dark: false },
  { key: 'nuitIndigo', label: 'Nuit Indigo', dark: true },
  { key: 'charbonCyan', label: 'Charbon & Cyan', dark: true },
  { key: 'onyxAmbre', label: 'Onyx & Ambre', dark: true },
]

export const DEFAULT_PALETTE = 'ardoiseIndigo'

/** Définitions de thèmes Vuetify dérivées des palettes. */
export const themes: Record<string, ThemeDefinition> = {
  ardoiseIndigo: {
    dark: false,
    colors: {
      ...semantic,
      primary: '#4F46E5',
      secondary: '#6366F1',
      background: '#F7F8FA',
      surface: '#FFFFFF',
    },
  },
  emeraudeSobre: {
    dark: false,
    colors: {
      ...semantic,
      primary: '#0E9F6E',
      secondary: '#10B981',
      background: '#F6F8F7',
      surface: '#FFFFFF',
    },
  },
  nuitIndigo: {
    dark: true,
    colors: {
      ...semantic,
      primary: '#818CF8',
      secondary: '#6366F1',
      background: '#0F1222',
      surface: '#1A1E33',
    },
  },
  charbonCyan: {
    dark: true,
    colors: {
      ...semantic,
      primary: '#22D3EE',
      secondary: '#06B6D4',
      background: '#101314',
      surface: '#1B1F21',
    },
  },
  onyxAmbre: {
    dark: true,
    colors: {
      ...semantic,
      primary: '#F59E0B',
      secondary: '#FBBF24',
      background: '#0D0D0F',
      surface: '#19191C',
    },
  },
}
