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

  const hasData = computed(
    () =>
      summary.value !== null &&
      (summary.value.totals.income > 0 || summary.value.totals.expense > 0),
  );

  async function fetchSummary(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      summary.value = await transactionsService.summary({
        from: period.value.from,
        to: period.value.to,
        granularity: period.value.granularity,
        timeZone: currentTimeZone(),
      });
    } catch (caught) {
      // Descartamos el resumen anterior: mostrarlo bajo el periodo nuevo
      // haría creer al usuario que esos son los datos del periodo elegido.
      summary.value = null;
      error.value =
        caught instanceof Error ? caught.message : 'No se pudo cargar el resumen';
    } finally {
      loading.value = false;
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
    hasData,
    fetchSummary,
    selectPreset,
    selectCustomRange,
  };
});
