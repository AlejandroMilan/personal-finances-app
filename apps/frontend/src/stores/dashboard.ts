import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { transactionsService } from '../services/transactions';
import type { SelectedPeriod, TransactionsSummaryView } from '../types/summary';
import {
  buildCustomPeriodRange,
  buildPeriodRange,
  currentTimeZone,
  type PeriodPreset,
} from '../utils/period';

export const useDashboardStore = defineStore('dashboard', () => {
  const period = ref<SelectedPeriod>(buildPeriodRange('month'));
  const summary = ref<TransactionsSummaryView | null>(null);
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
    summary.value = null;
    loading.value = false;
    error.value = null;
  }

  const hasData = computed(
    () =>
      summary.value !== null &&
      (summary.value.totals.income > 0 || summary.value.totals.expense > 0),
  );

  async function fetchSummary(): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    const selectedPeriod = period.value;
    loading.value = true;
    error.value = null;
    try {
      const loadedSummary = await transactionsService.summary({
        from: selectedPeriod.from,
        to: selectedPeriod.to,
        granularity: selectedPeriod.granularity,
        timeZone: currentTimeZone(),
      });
      if (isCurrentRequest(generation, request)) {
        summary.value = loadedSummary;
      }
    } catch (caught) {
      if (!isCurrentRequest(generation, request)) return;
      // Descartamos el resumen anterior: mostrarlo bajo el periodo nuevo
      // haría creer al usuario que esos son los datos del periodo elegido.
      summary.value = null;
      error.value =
        caught instanceof Error ? caught.message : 'No se pudo cargar el resumen';
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  function selectPreset(preset: PeriodPreset): Promise<void> {
    period.value = buildPeriodRange(preset);
    return fetchSummary();
  }

  function selectCustomRange(from: Date, to: Date): Promise<void> {
    period.value = buildCustomPeriodRange(from, to);
    return fetchSummary();
  }

  return {
    period,
    summary,
    loading,
    error,
    clear,
    hasData,
    fetchSummary,
    selectPreset,
    selectCustomRange,
  };
});
