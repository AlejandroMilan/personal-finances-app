<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import BudgetFormDialog from '../components/organisms/BudgetFormDialog.vue';
import BudgetStatusCard from '../components/organisms/BudgetStatusCard.vue';
import { useBudgetsStore } from '../stores/budgets';
import { useCategoriesStore } from '../stores/categories';
import { useDashboardStore } from '../stores/dashboard';
import type { BudgetItem, CreateBudgetPayload } from '../types/budget';
import { buildBudgetStatus, monthKey, type BudgetStatus } from '../utils/budget';
import { formatCurrency } from '../utils/money';

const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const dashboardStore = useDashboardStore();

const selectedMonth = ref(monthKey(new Date()));
const formOpen = ref(false);
const editorItems = ref<BudgetItem[]>([]);
const actionError = ref('');

const isMonth = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

function monthBounds(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    from: new Date(year, monthNumber - 1, 1, 0, 0, 0, 0),
    to: new Date(year, monthNumber, 0, 23, 59, 59, 999),
  };
}

function monthLabel(month: string): string {
  if (!isMonth(month)) return month;
  const [year, monthNumber] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthNumber - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const savedBudgets = computed(() =>
  [...budgetsStore.budgets].sort((left, right) =>
    right.month.localeCompare(left.month),
  ),
);

const selectedBudget = computed(() =>
  budgetsStore.budget?.month === selectedMonth.value
    ? budgetsStore.budget
    : null,
);

const summaryReady = computed(() => {
  if (dashboardStore.loading || !dashboardStore.summary) return false;
  return monthKey(dashboardStore.period.from) === selectedMonth.value;
});

const budgetStatus = computed<BudgetStatus | null>(() => {
  const budget = selectedBudget.value;
  const summary = dashboardStore.summary;
  if (!budget || !summary || !summaryReady.value) return null;

  const bounds = monthBounds(selectedMonth.value);
  try {
    return buildBudgetStatus([budget], summary, bounds.from, bounds.to);
  } catch {
    return null;
  }
});

const statusLoading = computed(
  () =>
    selectedBudget.value !== null &&
    (budgetsStore.loading || dashboardStore.loading || !summaryReady.value),
);

const pageLoading = computed(
  () =>
    budgetsStore.loading ||
    categoriesStore.loading ||
    dashboardStore.loading,
);

function categoryName(categoryId: string): string {
  return (
    categoriesStore.categories.find((category) => category.id === categoryId)
      ?.name ?? 'Deleted category'
  );
}

function itemTypeLabel(type: BudgetItem['type']): string {
  return type === 'income' ? 'Income' : 'Expense';
}

async function loadMonth(month: string): Promise<void> {
  if (!isMonth(month)) return;
  const bounds = monthBounds(month);
  await Promise.all([
    budgetsStore.fetchForMonth(month),
    dashboardStore.selectCustomRange(bounds.from, bounds.to),
  ]);
}

async function initialize(): Promise<void> {
  void categoriesStore.fetchCategories();
  await budgetsStore.fetchBudgets();
  await loadMonth(selectedMonth.value);
}

watch(selectedMonth, (month, previousMonth) => {
  if (month === previousMonth || !isMonth(month)) return;
  void loadMonth(month);
});

function selectMonth(month: string): void {
  selectedMonth.value = month;
}

async function openEditor(): Promise<void> {
  const month = selectedMonth.value;
  if (!isMonth(month)) return;

  actionError.value = '';
  try {
    if (selectedBudget.value) {
      editorItems.value = selectedBudget.value.items.map((item) => ({ ...item }));
    } else {
      editorItems.value = (await budgetsStore.fetchTemplate(month)).map((item) => ({
        ...item,
      }));
    }

    if (selectedMonth.value !== month) return;
    formOpen.value = true;
  } catch (caught) {
    actionError.value = message(caught, 'Could not prepare the budget');
  }
}

function openCreate(): Promise<void> {
  return openEditor();
}

async function save(payload: CreateBudgetPayload): Promise<void> {
  actionError.value = '';
  try {
    await budgetsStore.save(payload);
    formOpen.value = false;
  } catch (caught) {
    actionError.value = message(caught, 'Could not save the budget');
  }
}

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

onMounted(() => {
  void initialize();
});
</script>

<template>
  <v-container class="py-6">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Budgets</h1>
        <div class="text-body-2 text-medium-emphasis">
          Plan your income and expenses by month.
        </div>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        :loading="budgetsStore.loading"
        data-test="new-budget"
        @click="openCreate"
      >
        {{ selectedBudget ? 'Edit budget' : 'Create budget' }}
      </v-btn>
    </div>

    <v-alert v-if="actionError" type="error" class="mb-4" data-test="budget-action-error">
      {{ actionError }}
    </v-alert>
    <v-alert
      v-else-if="budgetsStore.error"
      type="error"
      class="mb-4"
      data-test="budget-load-error"
    >
      {{ budgetsStore.error }}
    </v-alert>

    <v-progress-linear v-if="pageLoading" indeterminate color="primary" class="mb-4" />

    <v-row>
      <v-col cols="12" md="4">
        <v-card color="surface" class="pa-4 h-100">
          <v-card-title class="d-flex align-center pa-0 pb-3">
            <v-icon icon="mdi-calendar-month" color="primary" size="20" class="mr-2" />
            <span class="text-subtitle-1 font-weight-bold">Choose month</span>
          </v-card-title>

          <v-text-field
            v-model="selectedMonth"
            type="month"
            label="Budget month"
            hint="You can also choose a future month"
            persistent-hint
            prepend-icon="mdi-calendar-edit"
            data-test="month-selector"
          />

          <v-divider class="my-4" />
          <div class="text-subtitle-2 font-weight-bold mb-2">Saved budgets</div>

          <v-list v-if="savedBudgets.length > 0" density="compact" class="pa-0" data-test="budget-list">
            <v-list-item
              v-for="budget in savedBudgets"
              :key="budget.month"
              :active="budget.month === selectedMonth"
              active-color="primary"
              data-test="saved-budget"
              @click="selectMonth(budget.month)"
            >
              <v-list-item-title>{{ monthLabel(budget.month) }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ budget.items.length }} {{ budget.items.length === 1 ? 'item' : 'items' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <div v-else class="text-body-2 text-medium-emphasis" data-test="budget-list-empty">
            No saved months yet.
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card color="surface" class="pa-4 mb-6" data-test="selected-budget">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3">
            <div>
              <div class="text-overline text-medium-emphasis">Selected period</div>
              <h2 class="text-h5 font-weight-bold">{{ monthLabel(selectedMonth) }}</h2>
            </div>
            <v-chip
              :color="selectedBudget ? 'success' : 'warning'"
              variant="tonal"
              data-test="budget-state"
            >
              {{ selectedBudget ? 'Budget created' : 'No budget' }}
            </v-chip>
          </div>

          <v-divider class="my-4" />

          <template v-if="selectedBudget">
            <div v-if="selectedBudget.items.length > 0" class="budget-items" data-test="budget-items-list">
              <div
                v-for="item in selectedBudget.items"
                :key="`${item.categoryId}-${item.type}`"
                class="d-flex flex-wrap align-center justify-space-between ga-2 py-2"
              >
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ categoryName(item.categoryId) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ itemTypeLabel(item.type) }}<span v-if="item.note"> · {{ item.note }}</span>
                  </div>
                </div>
                <div class="text-body-2 font-weight-medium">{{ formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis py-2">
              This budget has no items.
            </div>
          </template>
          <div v-else class="text-body-2 text-medium-emphasis">
            Create this budget to get a proposal based on your schedule.
          </div>

          <div class="d-flex justify-end mt-4">
            <v-btn
              color="primary"
              prepend-icon="mdi-pencil"
              :loading="budgetsStore.loading"
              :disabled="!isMonth(selectedMonth)"
              data-test="edit-budget"
              @click="openEditor"
            >
              {{ selectedBudget ? 'Edit items' : 'Create from schedule' }}
            </v-btn>
          </div>
        </v-card>

        <BudgetStatusCard
          v-if="selectedBudget"
          :month="selectedMonth"
          :status="budgetStatus"
          :categories="categoriesStore.categories"
          :loading="statusLoading"
        />
      </v-col>
    </v-row>

    <BudgetFormDialog
      v-model="formOpen"
      :month="selectedMonth"
      :items="editorItems"
      :categories="categoriesStore.categories"
      @save="save"
    />
  </v-container>
</template>
