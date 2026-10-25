<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'vue-chartjs';
import { chartTheme } from '../../plugins/charts';
import type { Debt, DebtMovement } from '../../types/debt';
import { balanceSeries } from '../../utils/debt';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  movements: DebtMovement[];
  debts: Debt[];
}>();

const ALL = 'all';
/** Qué serie mostrar: el saldo total o el de una deuda concreta. */
const selected = ref<string>(ALL);

const selectItems = computed(() => [
  { title: 'Todas las deudas', value: ALL },
  ...props.debts.map((debt) => ({ title: debt.name, value: debt.id })),
]);

const series = computed(() =>
  balanceSeries(props.movements, selected.value === ALL ? undefined : selected.value),
);

const chartData = computed(() => ({
  labels: series.value.map((point) => new Date(point.at).toLocaleDateString()),
  datasets: [
    {
      label: 'Saldo adeudado',
      data: series.value.map((point) => point.value),
      borderColor: chartTheme.primary,
      backgroundColor: chartTheme.primary,
      tension: 0.3,
      fill: false,
    },
  ],
}));

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'line'>) =>
          `Saldo: ${formatCurrency(context.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    y: {
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
        <span class="text-subtitle-1 font-weight-bold">Evolución de la deuda</span>
      </span>
      <v-select
        v-model="selected"
        :items="selectItems"
        density="compact"
        variant="outlined"
        hide-details
        data-test="evolution-select"
        class="evolution-select"
      />
    </v-card-title>

    <v-card-text class="pa-0">
      <div v-if="series.length === 0" class="chart-empty" data-test="evolution-empty">
        <v-icon icon="mdi-chart-line-variant" size="48" color="secondary" />
        <div class="text-body-2 text-medium-emphasis mt-2">Sin movimientos de deuda</div>
      </div>

      <div v-else class="chart-wrapper">
        <Line data-test="evolution-chart" :data="chartData" :options="chartOptions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.evolution-select {
  max-width: 240px;
}

.chart-wrapper {
  height: 280px;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
}
</style>
