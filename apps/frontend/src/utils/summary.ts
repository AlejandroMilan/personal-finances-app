import type { CategoryView } from '../types/category';
import type {
  CategoryTotalView,
  SummaryPointView,
} from '../types/summary';
import type { Granularity } from './period';

export const UNCATEGORISED_LABEL = 'Sin categoría';

/** Color neutro del tema para el grupo "Sin categoría". */
export const UNCATEGORISED_COLOR = '#9E9585';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DonutData {
  slices: DonutSlice[];
  total: number;
  isEmpty: boolean;
}

export interface LineSeries {
  labels: string[];
  income: number[];
  expense: number[];
  isEmpty: boolean;
}

export type LineMode = 'rate' | 'cumulative';

/**
 * Convierte los totales por categoría en porciones listas para la dona.
 * El nombre y el color salen del catálogo de categorías del usuario; el backend
 * solo envía identificadores.
 */
export function toDonutData(
  totals: CategoryTotalView[],
  categories: CategoryView[],
  fallbackPalette: readonly string[] = [],
): DonutData {
  const byId = new Map(categories.map((category) => [category.id, category]));

  const slices = totals
    .filter((entry) => entry.total > 0)
    .map((entry, index) => {
      const category = entry.categoryId ? byId.get(entry.categoryId) : undefined;

      if (!entry.categoryId) {
        return {
          label: UNCATEGORISED_LABEL,
          value: entry.total,
          color: UNCATEGORISED_COLOR,
        };
      }

      return {
        label: category?.name ?? UNCATEGORISED_LABEL,
        value: entry.total,
        color:
          category?.color ??
          fallbackPalette[index % Math.max(fallbackPalette.length, 1)] ??
          UNCATEGORISED_COLOR,
      };
    });

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return { slices, total: roundToCents(total), isEmpty: slices.length === 0 };
}

/**
 * Serie temporal de la gráfica lineal. En modo `cumulative` cada punto acumula
 * lo anterior; en modo `rate` cada punto es el total de su propio intervalo.
 */
export function toLineSeries(
  points: SummaryPointView[],
  mode: LineMode,
  granularity: Granularity,
  locale?: string,
): LineSeries {
  const labels = points.map((point) =>
    formatBucketLabel(point.bucket, granularity, locale),
  );

  const accumulate = (values: number[]): number[] => {
    let running = 0;
    return values.map((value) => {
      running += value;
      return roundToCents(running);
    });
  };

  const income = points.map((point) => point.income);
  const expense = points.map((point) => point.expense);
  const hasMovement = points.some(
    (point) => point.income > 0 || point.expense > 0,
  );

  return {
    labels,
    income: mode === 'cumulative' ? accumulate(income) : income,
    expense: mode === 'cumulative' ? accumulate(expense) : expense,
    isEmpty: points.length === 0 || !hasMovement,
  };
}

/** Etiqueta del eje temporal acorde a la granularidad del periodo. */
export function formatBucketLabel(
  bucket: string,
  granularity: Granularity,
  locale?: string,
): string {
  const date = new Date(bucket);

  if (granularity === 'hour') {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  if (granularity === 'day') {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
