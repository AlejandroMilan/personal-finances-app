import { ref } from 'vue';
import { defineStore } from 'pinia';
import { budgetsService } from '../services/budgets';
import type {
  Budget,
  BudgetItem,
  CreateBudgetPayload,
} from '../types/budget';

export const useBudgetsStore = defineStore('budgets', () => {
  const month = ref<string | null>(null);
  const budget = ref<Budget | null>(null);
  const template = ref<BudgetItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let sessionGeneration = 0;
  let requestId = 0;

  function isCurrentRequest(generation: number, request: number): boolean {
    return generation === sessionGeneration && request === requestId;
  }

  function clear(): void {
    sessionGeneration += 1;
    requestId += 1;
    month.value = null;
    budget.value = null;
    template.value = [];
    loading.value = false;
    error.value = null;
  }

  async function fetchForMonth(selectedMonth: string): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    month.value = selectedMonth;
    loading.value = true;
    error.value = null;
    try {
      const loadedBudget = await budgetsService.getByMonth(selectedMonth);
      if (isCurrentRequest(generation, request)) {
        budget.value = loadedBudget;
      }
    } catch (caught) {
      if (!isCurrentRequest(generation, request)) return;
      budget.value = null;
      error.value =
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar el presupuesto';
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  async function fetchTemplate(selectedMonth: string): Promise<BudgetItem[]> {
    const generation = sessionGeneration;
    const request = ++requestId;
    month.value = selectedMonth;
    loading.value = true;
    error.value = null;
    try {
      const loadedTemplate = await budgetsService.template(selectedMonth);
      if (!isCurrentRequest(generation, request)) return [];
      template.value = loadedTemplate;
      return loadedTemplate;
    } catch (caught) {
      if (!isCurrentRequest(generation, request)) return [];
      template.value = [];
      error.value =
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar la plantilla del presupuesto';
      throw caught;
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  async function save(payload: CreateBudgetPayload): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      const savedBudget =
        budget.value?.month === payload.month
          ? await budgetsService.update(payload.month, { items: payload.items })
          : await budgetsService.create(payload);

      if (isCurrentRequest(generation, request)) {
        month.value = payload.month;
        budget.value = savedBudget;
      }
    } catch (caught) {
      if (isCurrentRequest(generation, request)) {
        error.value =
          caught instanceof Error
            ? caught.message
            : 'No se pudo guardar el presupuesto';
      }
      throw caught;
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  return {
    month,
    budget,
    template,
    loading,
    error,
    fetchForMonth,
    fetchTemplate,
    save,
    clear,
  };
});
