<script setup lang="ts">
import { computed, onMounted } from 'vue';
import PeriodFilter from '../molecules/PeriodFilter.vue';
import CategoryDonutCard from '../molecules/CategoryDonutCard.vue';
import IncomeExpenseLineCard from '../molecules/IncomeExpenseLineCard.vue';
import { fallbackPalette } from '../../plugins/charts';
import { useCategoriesStore } from '../../stores/categories';
import { useDashboardStore } from '../../stores/dashboard';
import type { PeriodRange } from '../../utils/period';
import { toDonutData } from '../../utils/summary';

const dashboard = useDashboardStore();
const categories = useCategoriesStore();

const expenses = computed(() =>
  toDonutData(
    dashboard.summary?.byCategory.expense ?? [],
    categories.categories,
    fallbackPalette,
  ),
);

const income = computed(() =>
  toDonutData(
    dashboard.summary?.byCategory.income ?? [],
    categories.categories,
    fallbackPalette,
  ),
);

const points = computed(() => dashboard.summary?.series ?? []);

const granularity = computed(() => dashboard.period.granularity);

const periodLabel = computed(() => {
  const format = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${format.format(dashboard.period.from)} — ${format.format(dashboard.period.to)}`;
});

function applyPeriod(range: PeriodRange): void {
  if (range.kind === 'custom') {
    void dashboard.selectCustomRange(range.from, range.to);
    return;
  }
  void dashboard.selectPreset(range.kind);
}

onMounted(() => {
  void categories.fetchCategories();
  void dashboard.fetchSummary();
});
</script>

<template>
  <section>
    <div
      class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4"
    >
      <div>
        <h1 class="text-h5 font-weight-bold">Resumen</h1>
        <div class="text-caption text-medium-emphasis" data-test="period-label">
          {{ periodLabel }}
        </div>
      </div>
      <PeriodFilter :kind="dashboard.period.kind" @select="applyPeriod" />
    </div>

    <v-alert
      v-if="dashboard.error"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="dashboard-error"
    >
      {{ dashboard.error }}
    </v-alert>

    <v-row>
      <v-col cols="12" md="6">
        <CategoryDonutCard
          data-test="expenses-card"
          title="Gastos por categoría"
          icon="mdi-arrow-down-circle"
          :data="expenses"
          :loading="dashboard.loading"
        />
      </v-col>
      <v-col cols="12" md="6">
        <CategoryDonutCard
          data-test="income-card"
          title="Ingresos por categoría"
          icon="mdi-arrow-up-circle"
          :data="income"
          :loading="dashboard.loading"
        />
      </v-col>
      <v-col cols="12">
        <IncomeExpenseLineCard
          data-test="line-card"
          :points="points"
          :granularity="granularity"
          :loading="dashboard.loading"
        />
      </v-col>
    </v-row>
  </section>
</template>
