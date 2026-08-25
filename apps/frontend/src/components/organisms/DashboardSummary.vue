<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PeriodFilter from '../molecules/PeriodFilter.vue';
import MissingBudgetAlert from '../molecules/MissingBudgetAlert.vue';
import CategoryDonutCard from '../molecules/CategoryDonutCard.vue';
import IncomeExpenseLineCard from '../molecules/IncomeExpenseLineCard.vue';
import BudgetStatusCard from './BudgetStatusCard.vue';
import { fallbackPalette } from '../../plugins/charts';
import { useCategoriesStore } from '../../stores/categories';
import { useDashboardStore } from '../../stores/dashboard';
import { useBudgetsStore } from '../../stores/budgets';
import type { PeriodRange } from '../../utils/period';
import {
  buildBudgetStatus,
  monthKey,
  type BudgetStatus,
} from '../../utils/budget';
import { toDonutData } from '../../utils/summary';

const dashboard = useDashboardStore();
const categories = useCategoriesStore();
const budgets = useBudgetsStore();

const currentMonth = monthKey(new Date());
const budgetsLoaded = ref(false);

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
  const format = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${format.format(dashboard.period.from)} — ${format.format(dashboard.period.to)}`;
});

const hasCurrentBudget = computed(() =>
  budgets.budgets.some((budget) => budget.month === currentMonth) ||
  budgets.budget?.month === currentMonth,
);

const showMissingBudget = computed(
  () =>
    budgetsLoaded.value &&
    !budgets.loading &&
    !budgets.error &&
    !hasCurrentBudget.value,
);

const budgetStatusLoading = computed(
  () => budgets.loading || dashboard.loading || dashboard.summary === null,
);

const budgetStatus = computed<BudgetStatus | null>(() => {
  if (
    budgets.loading ||
    budgets.error ||
    dashboard.loading ||
    !dashboard.summary
  ) {
    return null;
  }

  try {
    return buildBudgetStatus(
      budgets.budgets,
      dashboard.summary,
      dashboard.period.from,
      dashboard.period.to,
    );
  } catch {
    return null;
  }
});

const budgetPeriodMonth = computed(() => monthKey(dashboard.period.from));

function budgetFiltersForPeriod(): { from: string; to: string; limit: number } {
  const selectedFrom = monthKey(dashboard.period.from);
  const selectedTo = monthKey(dashboard.period.to);

  return {
    from: selectedFrom < currentMonth ? selectedFrom : currentMonth,
    to: selectedTo > currentMonth ? selectedTo : currentMonth,
    limit: 100,
  };
}

async function refreshBudgets(): Promise<void> {
  try {
    await budgets.fetchBudgets(budgetFiltersForPeriod());
  } finally {
    budgetsLoaded.value = true;
  }
}

async function applyPeriod(range: PeriodRange): Promise<void> {
  let summaryRequest: Promise<void>;
  if (range.kind === 'custom') {
    summaryRequest = dashboard.selectCustomRange(range.from, range.to);
  } else {
    summaryRequest = dashboard.selectPreset(range.kind);
  }

  await Promise.all([summaryRequest, refreshBudgets()]);
}

onMounted(() => {
  void categories.fetchCategories();
  void dashboard.fetchSummary();
  void refreshBudgets();
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

    <MissingBudgetAlert v-if="showMissingBudget" :month="currentMonth" />

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

    <BudgetStatusCard
      v-if="dashboard.summary"
      :month="budgetPeriodMonth"
      :period-label="periodLabel"
      :status="budgetStatus"
      :categories="categories.categories"
      :loading="budgetStatusLoading"
      class="mt-4"
    />
  </section>
</template>
