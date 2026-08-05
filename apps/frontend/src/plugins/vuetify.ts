import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const greenBeige = {
  dark: false,
  colors: {
    primary: '#2E6B4F',
    secondary: '#D9C5A0',
    accent: '#7FA56E',
    error: '#B3261E',
    info: '#2F6D80',
    success: '#3E7C4F',
    warning: '#C98A2D',
    surface: '#FBF7EC',
    background: '#F4EDDD',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'greenBeige',
    themes: {
      greenBeige,
    },
  },
})
