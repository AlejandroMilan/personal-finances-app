import type { Granularity, PeriodKind } from '../utils/period';

export interface CategoryTotalView {
  /** `null` agrupa las transacciones sin categoría. */
  categoryId: string | null;
  total: number;
}

export interface SummaryPointView {
  /** Instante ISO del inicio del intervalo. */
  bucket: string;
  income: number;
  expense: number;
}

export interface TransactionsSummaryView {
  from: string;
  to: string;
  granularity: Granularity;
  timeZone: string;
  totals: { income: number; expense: number };
  byCategory: {
    income: CategoryTotalView[];
    expense: CategoryTotalView[];
  };
  series: SummaryPointView[];
}

export interface SummaryQueryParams {
  from: Date;
  to: Date;
  granularity: Granularity;
  timeZone: string;
}

export interface SelectedPeriod {
  kind: PeriodKind;
  from: Date;
  to: Date;
  granularity: Granularity;
}
