<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'vue-chartjs';
import { chartTheme } from '../../plugins/charts';
import type { SummaryPointView } from '../../types/summary';
import type { Granularity } from '../../utils/period';
import { formatCurrency } from '../../utils/money';
import { toLineSeries, type LineMode } from '../../utils/summary';

const props = defineProps<{
  points: SummaryPointView[];
  granularity: Granularity;
  loading?: boolean;
}>();

/** El modo es estado de presentación: alternarlo no vuelve a pedir datos. */
const mode = ref<LineMode>('rate');

const series = computed(() =>
  toLineSeries(props.points, mode.value, props.granularity),
);

const chartData = computed(() => ({
  labels: series.value.labels,
  datasets: [
    {
      label: 'Ingresos',
      data: series.value.income,
      borderColor: chartTheme.success,
      backgroundColor: chartTheme.success,
      tension: 0.3,
      fill: false,
    },
    {
      label: 'Gastos',
      data: series.value.expense,
      borderColor: chartTheme.error,
      backgroundColor: chartTheme.error,
      tension: 0.3,
      fill: false,
    },
  ],
}));

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'line'>) =>
          `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) => formatCurrency(Number(value)),
      },
    },
  },
};
</script>

<template>
  <v-card color="surface" class="pa-4">
    <v-card-title
      class="d-flex flex-wrap align-center justify-space-between pa-0 pb-3 ga-2"
    >
      <span class="d-flex align-center">
        <v-icon icon="mdi-chart-line" color="primary" size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Gastos vs Ingresos</span>
      </span>

      <v-btn-toggle
        v-model="mode"
        data-test="line-mode"
        density="compact"
        variant="outlined"
        color="primary"
        mandatory
      >
        <v-btn value="rate" size="small" data-test="mode-rate">Ritmo</v-btn>
        <v-btn value="cumulative" size="small" data-test="mode-cumulative">
          Acumulado
        </v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-card-text class="pa-0">
      <div v-if="props.loading" class="d-flex justify-center py-10">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="series.isEmpty" class="line-empty" data-test="line-empty">
        <v-icon icon="mdi-chart-line-variant" size="48" color="secondary" />
        <div class="text-body-2 text-medium-emphasis mt-2">
          Sin movimientos en este periodo
        </div>
      </div>

      <div v-else class="line-wrapper">
        <Line data-test="line-chart" :data="chartData" :options="chartOptions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.line-wrapper {
  height: 280px;
}

.line-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
  opacity: 0.7;
}
</style>
