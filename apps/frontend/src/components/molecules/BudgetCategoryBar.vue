<script setup lang="ts">
import { computed } from 'vue';
import type { BudgetItemType } from '../../types/budget';
import type { BudgetStatusRow } from '../../utils/budget';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  row: BudgetStatusRow;
  categoryName: string;
}>();

const progress = computed(() => {
  if (props.row.planned <= 0) return 0;
  return Math.min(100, Math.max(0, props.row.ratio * 100));
});

const progressColor = computed(() => {
  if (props.row.remaining < 0) return 'error';
  return props.row.type === 'income' ? 'info' : 'primary';
});

const typeLabel = (type: BudgetItemType): string =>
  type === 'income' ? 'Income' : 'Expense';

const remainingLabel = computed(() =>
  props.row.remaining < 0 ? 'Over budget' : 'Remaining',
);
</script>

<template>
  <div class="budget-category-bar py-3" data-test="budget-category-bar">
    <div class="d-flex align-center justify-space-between mb-1">
      <div class="d-flex align-center ga-2">
        <span class="text-body-2 font-weight-medium">{{ categoryName }}</span>
        <v-chip size="x-small" variant="tonal" :color="progressColor">
          {{ typeLabel(row.type) }}
        </v-chip>
      </div>
      <span class="text-caption text-medium-emphasis">
        {{ Math.round(progress) }}%
      </span>
    </div>

    <v-progress-linear
      :model-value="progress"
      :color="progressColor"
      height="8"
      rounded
      aria-label="Budget progress"
    />

    <div class="d-flex flex-wrap justify-space-between ga-2 mt-2 text-caption">
      <span>Planned: {{ formatCurrency(row.planned) }}</span>
      <span>Actual: {{ formatCurrency(row.actual) }}</span>
      <span :class="row.remaining < 0 ? 'text-error' : 'text-medium-emphasis'">
        {{ remainingLabel }}: {{ formatCurrency(Math.abs(row.remaining)) }}
      </span>
    </div>
  </div>
</template>
