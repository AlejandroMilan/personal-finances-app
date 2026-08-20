export interface CategoryTotalView {
  categoryId: string | null;
  total: number;
}

export interface SummaryPointView {
  bucket: string;
  income: number;
  expense: number;
}

export interface TransactionsSummaryView {
  from: string;
  to: string;
  granularity: string;
  timeZone: string;
  totals: { income: number; expense: number };
  byCategory: {
    income: CategoryTotalView[];
    expense: CategoryTotalView[];
  };
  series: SummaryPointView[];
}
