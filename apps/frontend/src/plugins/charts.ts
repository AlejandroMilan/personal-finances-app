import {
  ArcElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

/**
 * Registro explícito de Chart.js: solo lo que usan la dona y la línea del
 * dashboard. Registrar `...registerables` arrastraría todos los tipos de
 * gráfica al bundle.
 */
Chart.register(
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
);

/** Tokens del tema greenBeige usados por las gráficas. */
export const chartTheme = {
  primary: '#2E6B4F',
  secondary: '#D9C5A0',
  accent: '#7FA56E',
  error: '#B3261E',
  success: '#3E7C4F',
  warning: '#C98A2D',
  info: '#2F6D80',
  surface: '#FBF7EC',
  onSurface: '#1D1B16',
  muted: '#9E9585',
} as const;

/** Paleta de reserva para categorías sin color propio, derivada del tema. */
export const fallbackPalette = [
  chartTheme.primary,
  chartTheme.accent,
  chartTheme.secondary,
  chartTheme.info,
  chartTheme.warning,
  chartTheme.success,
] as const;

export default Chart;
