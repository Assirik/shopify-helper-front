import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { fr } from 'vuetify/locale'
import { DEFAULT_PALETTE, themes } from '@/theme/palettes'

export default createVuetify({
  // Interface en français (pied de tableau, pagination, états vides, etc.)
  locale: {
    locale: 'fr',
    fallback: 'fr',
    messages: { fr },
  },
  theme: {
    defaultTheme: DEFAULT_PALETTE,
    themes,
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  defaults: {
    // Densité « confortable » par défaut (cf. décisions design)
    VDataTable: { density: 'comfortable' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VBtn: { variant: 'flat' },
  },
})
