<script setup lang="ts">
import { computed } from 'vue';
import BudgetCategoryBar from '../molecules/BudgetCategoryBar.vue';
import type { CategoryView } from '../../types/category';
import { buildBudgetTotals, type BudgetStatus } from '../../utils/budget';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  month: string;
  periodLabel?: string;
  status: BudgetStatus | null;
  categories: CategoryView[];
  loading?: boolean;
}>();

const incomeRows = computed(() =>
  props.status?.rows.filter((row) => row.type === 'income') ?? [],
);

const expenseRows = computed(() =>
  props.status?.rows.filter((row) => row.type === 'expense') ?? [],
);

const totals = computed(() =>
  props.status ? buildBudgetTotals(props.status) : null,
);

const hasPlannedBudget = computed(
  () =>
    totals.value !== null &&
    (totals.value.expense.planned > 0 || totals.value.income.planned > 0),
);

const expensePercentage = computed(() =>
  Math.round((totals.value?.expense.ratio ?? 0) * 100),
);

const overspent = computed(() => (totals.value?.expense.difference ?? 0) < 0);

function categoryName(categoryId: string | null): string {
  if (!categoryId) return 'Uncategorized';
  return (
    props.categories.find((category) => category.id === categoryId)?.name ??
    'Deleted category'
  );
}
</script>

<template>
  <v-card color="surface" class="pa-4" data-test="budget-status-card">
    <v-card-title class="d-flex align-center pa-0 pb-2">
      <v-icon icon="mdi-chart-timeline-variant" color="primary" size="20" class="mr-2" />
      <span class="text-subtitle-1 font-weight-bold">Budget progress</span>
      <span class="text-caption text-medium-emphasis ml-auto">
        {{ props.periodLabel ?? props.month }}
      </span>
    </v-card-title>

    <v-card-text class="pa-0">
      <div v-if="loading" class="d-flex justify-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-else-if="status">
        <v-alert
          v-if="status.missingMonths.length > 0"
          type="warning"
          variant="tonal"
          class="mb-3"
          data-test="budget-missing-months"
        >
          Missing budgets for: {{ status.missingMonths.join(', ') }}
        </v-alert>

        <div
          v-if="hasPlannedBudget && totals"
          class="budget-totals mb-3"
          data-test="budget-period-totals"
        >
          <div class="d-flex flex-wrap justify-space-between ga-2">
            <span class="text-body-2">Budgeted expenses</span>
            <span class="text-body-2 font-weight-bold" data-test="period-total-planned">
              {{ formatCurrency(totals.expense.planned) }}
            </span>
          </div>
          <div class="d-flex flex-wrap justify-space-between ga-2">
            <span class="text-body-2">Actual expenses</span>
            <span class="text-body-2 font-weight-bold" data-test="period-total-actual">
              {{ formatCurrency(totals.expense.actual) }}
            </span>
          </div>
          <v-progress-linear
            :model-value="Math.min(100, Math.max(0, expensePercentage))"
            :color="overspent ? 'error' : 'primary'"
            height="8"
            rounded
            class="my-2"
            aria-label="Budget total progress"
          />
          <div class="d-flex flex-wrap justify-space-between ga-2 text-caption">
            <span
              :class="overspent ? 'text-error' : 'text-medium-emphasis'"
              data-test="period-total-difference"
            >
              {{ overspent ? 'Over budget' : 'Remaining' }}:
              {{ formatCurrency(Math.abs(totals.expense.difference)) }}
            </span>
            <span class="text-medium-emphasis" data-test="period-total-percentage">
              {{ expensePercentage }}% of the budget
            </span>
          </div>
          <div
            v-if="totals.income.planned > 0"
            class="d-flex flex-wrap justify-space-between ga-2 text-caption mt-1"
          >
            <span class="text-medium-emphasis" data-test="period-total-income">
              Budgeted income: {{ formatCurrency(totals.income.planned) }} · Actual:
              {{ formatCurrency(totals.income.actual) }}
            </span>
          </div>
        </div>

        <div
          v-else
          class="text-body-2 text-medium-emphasis mb-3"
          data-test="budget-period-totals-empty"
        >
          There is no budget defined for this period yet.
        </div>

        <v-divider class="mb-3" />

        <section v-if="incomeRows.length > 0" data-test="budget-income-status">
          <div class="text-subtitle-2 font-weight-bold mb-1">Income</div>
          <BudgetCategoryBar
            v-for="row in incomeRows"
            :key="`${row.type}-${row.categoryId ?? 'uncategorized'}`"
            :row="row"
            :category-name="categoryName(row.categoryId)"
          />
        </section>

        <v-divider v-if="incomeRows.length > 0 && expenseRows.length > 0" class="my-2" />

        <section v-if="expenseRows.length > 0" data-test="budget-expense-status">
          <div class="text-subtitle-2 font-weight-bold mb-1">Expenses</div>
          <BudgetCategoryBar
            v-for="row in expenseRows"
            :key="`${row.type}-${row.categoryId ?? 'uncategorized'}`"
            :row="row"
            :category-name="categoryName(row.categoryId)"
          />
        </section>

        <div v-if="status.rows.length === 0" class="text-body-2 text-medium-emphasis py-4 text-center">
          There are no actual transactions or budget items to compare yet.
        </div>
      </template>

      <div v-else class="text-body-2 text-medium-emphasis py-4 text-center">
        No actual data for this period.
      </div>
    </v-card-text>
  </v-card>
</template>
