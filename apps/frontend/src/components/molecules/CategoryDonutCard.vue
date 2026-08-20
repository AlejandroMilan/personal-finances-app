<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { chartTheme } from '../../plugins/charts';
import type { DonutData } from '../../utils/summary';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  title: string;
  icon: string;
  data: DonutData;
  loading?: boolean;
}>();

const chartData = computed(() => ({
  labels: props.data.slices.map((slice) => slice.label),
  datasets: [
    {
      data: props.data.slices.map((slice) => slice.value),
      backgroundColor: props.data.slices.map((slice) => slice.color),
      borderColor: chartTheme.surface,
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: { label: string; parsed: number }) =>
          `${context.label}: ${formatCurrency(context.parsed)}`,
      },
    },
  },
};
</script>

<template>
  <v-card color="surface" class="pa-4 h-100">
    <v-card-title class="d-flex align-center pa-0 pb-3">
      <v-icon :icon="props.icon" color="primary" size="20" class="mr-2" />
      <span class="text-subtitle-1 font-weight-bold">{{ props.title }}</span>
    </v-card-title>

    <v-card-text class="pa-0">
      <div v-if="props.loading" class="d-flex justify-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-else>
        <div class="donut-wrapper">
          <div v-if="props.data.isEmpty" class="donut-empty" data-test="donut-empty">
            <v-icon icon="mdi-chart-donut" size="48" color="secondary" />
            <div class="text-body-2 text-medium-emphasis mt-2">
              Sin movimientos en este periodo
            </div>
          </div>
          <Doughnut
            v-else
            data-test="donut-chart"
            :data="chartData"
            :options="chartOptions"
          />

          <div class="donut-center" data-test="donut-total">
            <div class="text-caption text-medium-emphasis">Total</div>
            <div class="text-h6 font-weight-bold">
              {{ formatCurrency(props.data.total) }}
            </div>
          </div>
        </div>

        <v-divider class="my-3" />

        <ul v-if="!props.data.isEmpty" class="donut-legend" data-test="donut-legend">
          <li
            v-for="slice in props.data.slices"
            :key="slice.label"
            class="d-flex align-center justify-space-between py-1"
          >
            <span class="d-flex align-center">
              <span
                class="donut-legend__dot"
                :style="{ backgroundColor: slice.color }"
              />
              <span class="text-body-2">{{ slice.label }}</span>
            </span>
            <span class="text-body-2 font-weight-medium">
              {{ formatCurrency(slice.value) }}
            </span>
          </li>
        </ul>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.donut-wrapper {
  position: relative;
  height: 220px;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
}

.donut-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.7;
}

.donut-legend {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 160px;
  overflow-y: auto;
}

.donut-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex: 0 0 auto;
}
</style>
