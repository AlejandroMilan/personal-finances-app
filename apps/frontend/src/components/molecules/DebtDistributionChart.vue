<script setup lang="ts">
import { computed } from 'vue';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Pie } from 'vue-chartjs';
import { fallbackPalette } from '../../plugins/charts';
import type { Debt } from '../../types/debt';
import { debtShares } from '../../utils/debt';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{ debts: Debt[] }>();

const shares = computed(() => debtShares(props.debts));

const chartData = computed(() => ({
  labels: shares.value.map((share) => share.name),
  datasets: [
    {
      data: shares.value.map((share) => share.amount),
      backgroundColor: shares.value.map(
        (_, index) => fallbackPalette[index % fallbackPalette.length],
      ),
      borderWidth: 1,
    },
  ],
}));

const chartOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'pie'>) => {
          const share = shares.value[context.dataIndex];
          const percent = Math.round(share.ratio * 100);
          return `${share.name}: ${formatCurrency(share.amount)} (${percent}%)`;
        },
      },
    },
  },
};
</script>

<template>
  <v-card color="surface" class="pa-4">
    <v-card-title class="d-flex align-center pa-0 pb-3">
      <v-icon icon="mdi-chart-pie" color="primary" size="20" class="mr-2" />
      <span class="text-subtitle-1 font-weight-bold">Total adeudado por deuda</span>
    </v-card-title>

    <v-card-text class="pa-0">
      <div v-if="shares.length === 0" class="chart-empty" data-test="distribution-empty">
        <v-icon icon="mdi-chart-pie" size="48" color="secondary" />
        <div class="text-body-2 text-medium-emphasis mt-2">Sin deudas registradas</div>
      </div>

      <div v-else class="chart-wrapper">
        <Pie data-test="distribution-chart" :data="chartData" :options="chartOptions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
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
