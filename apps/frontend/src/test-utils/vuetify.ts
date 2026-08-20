import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

/**
 * Vuetify mínimo para montar componentes en jsdom, con el mismo tema que la app
 * para que los tests vean los colores reales.
 */
export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'greenBeige',
    themes: {
      greenBeige: {
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
      },
    },
  },
});

export const mountOptions = { global: { plugins: [vuetify] } };
