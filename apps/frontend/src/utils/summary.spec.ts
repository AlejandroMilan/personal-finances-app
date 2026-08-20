import { describe, expect, it } from 'vitest';
import type { CategoryView } from '../types/category';
import type { SummaryPointView } from '../types/summary';
import {
  UNCATEGORISED_COLOR,
  UNCATEGORISED_LABEL,
  formatBucketLabel,
  toDonutData,
  toLineSeries,
} from './summary';

const categories: CategoryView[] = [
  { id: 'c1', name: 'Comida', color: '#2E6B4F' },
  { id: 'c2', name: 'Transporte', color: '#7FA56E' },
];

describe('toDonutData', () => {
  it('uses the name and colour of each category', () => {
    const data = toDonutData(
      [
        { categoryId: 'c1', total: 120 },
        { categoryId: 'c2', total: 80 },
      ],
      categories,
    );

    expect(data.slices).toEqual([
      { label: 'Comida', value: 120, color: '#2E6B4F' },
      { label: 'Transporte', value: 80, color: '#7FA56E' },
    ]);
    expect(data.total).toBe(200);
    expect(data.isEmpty).toBe(false);
  });

  it('groups the null category under "Sin categoría" with a neutral colour', () => {
    const data = toDonutData([{ categoryId: null, total: 45.5 }], categories);

    expect(data.slices[0].label).toBe(UNCATEGORISED_LABEL);
    expect(data.slices[0].color).toBe(UNCATEGORISED_COLOR);
    expect(data.total).toBe(45.5);
  });

  it('falls back to the palette when the category has no colour of its own', () => {
    const data = toDonutData([{ categoryId: 'ghost', total: 10 }], [], [
      '#111111',
      '#222222',
    ]);

    expect(data.slices[0].color).toBe('#111111');
  });

  it('falls back to the neutral colour when there is no palette either', () => {
    const data = toDonutData([{ categoryId: 'ghost', total: 10 }], []);

    expect(data.slices[0].color).toBe(UNCATEGORISED_COLOR);
  });

  it('drops categories without amount and reports an empty result', () => {
    const data = toDonutData(
      [
        { categoryId: 'c1', total: 0 },
        { categoryId: 'c2', total: 0 },
      ],
      categories,
    );

    expect(data.slices).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.isEmpty).toBe(true);
  });

  it('reports an empty result for a period with no movements', () => {
    expect(toDonutData([], categories).isEmpty).toBe(true);
  });

  it('closes floating point drift on the total', () => {
    const data = toDonutData(
      [
        { categoryId: 'c1', total: 0.1 },
        { categoryId: 'c2', total: 0.2 },
      ],
      categories,
    );

    expect(data.total).toBe(0.3);
  });
});

describe('toLineSeries', () => {
  const points: SummaryPointView[] = [
    { bucket: '2026-08-01T06:00:00.000Z', income: 100, expense: 40 },
    { bucket: '2026-08-02T06:00:00.000Z', income: 0, expense: 60 },
    { bucket: '2026-08-03T06:00:00.000Z', income: 50, expense: 0 },
  ];

  it('returns the total of each interval in rate mode', () => {
    const series = toLineSeries(points, 'rate', 'day', 'es-MX');

    expect(series.income).toEqual([100, 0, 50]);
    expect(series.expense).toEqual([40, 60, 0]);
    expect(series.labels).toHaveLength(3);
    expect(series.isEmpty).toBe(false);
  });

  it('adds up progressively from the start of the period in cumulative mode', () => {
    const series = toLineSeries(points, 'cumulative', 'day', 'es-MX');

    expect(series.income).toEqual([100, 100, 150]);
    expect(series.expense).toEqual([40, 100, 100]);
  });

  it('keeps the cumulative series monotonic', () => {
    const series = toLineSeries(points, 'cumulative', 'day', 'es-MX');

    for (let i = 1; i < series.income.length; i += 1) {
      expect(series.income[i]).toBeGreaterThanOrEqual(series.income[i - 1]);
      expect(series.expense[i]).toBeGreaterThanOrEqual(series.expense[i - 1]);
    }
  });

  it('closes floating point drift while accumulating', () => {
    const series = toLineSeries(
      [
        { bucket: '2026-08-01T06:00:00.000Z', income: 0.1, expense: 0 },
        { bucket: '2026-08-02T06:00:00.000Z', income: 0.2, expense: 0 },
      ],
      'cumulative',
      'day',
      'es-MX',
    );

    expect(series.income).toEqual([0.1, 0.3]);
  });

  it('reports an empty series for a period without points', () => {
    const series = toLineSeries([], 'rate', 'day', 'es-MX');

    expect(series.labels).toEqual([]);
    expect(series.isEmpty).toBe(true);
  });

  it('reports an empty series when every interval is zero', () => {
    const series = toLineSeries(
      [{ bucket: '2026-08-01T06:00:00.000Z', income: 0, expense: 0 }],
      'rate',
      'day',
      'es-MX',
    );

    expect(series.isEmpty).toBe(true);
  });
});

describe('formatBucketLabel', () => {
  const bucket = '2026-08-20T15:00:00.000Z';

  it('labels hourly buckets with the time', () => {
    const label = formatBucketLabel(bucket, 'hour', 'es-MX');

    expect(label).toMatch(/^\d{2}:\d{2}$/);
  });

  it('labels daily buckets with day and month', () => {
    const label = formatBucketLabel(bucket, 'day', 'es-MX');

    expect(label).toMatch(/\d{2}/);
    expect(label.length).toBeGreaterThan(2);
  });

  it('labels monthly buckets with month and year', () => {
    const label = formatBucketLabel(bucket, 'month', 'es-MX');

    expect(label).toContain('2026');
  });
});
