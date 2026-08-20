import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div data-test="line-chart" />',
  },
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<div data-test="donut-chart" />',
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import type { SummaryPointView } from '../../types/summary';
import type { Granularity } from '../../utils/period';
import IncomeExpenseLineCard from './IncomeExpenseLineCard.vue';

const points: SummaryPointView[] = [
  { bucket: '2026-08-01T06:00:00.000Z', income: 100, expense: 40 },
  { bucket: '2026-08-02T06:00:00.000Z', income: 0, expense: 60 },
  { bucket: '2026-08-03T06:00:00.000Z', income: 50, expense: 0 },
];

const mountCard = (
  data: SummaryPointView[] = points,
  granularity: Granularity = 'day',
) =>
  mount(IncomeExpenseLineCard, {
    ...mountOptions,
    props: { points: data, granularity },
  });

const datasets = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.findComponent({ name: 'Line' }).props('data').datasets;

describe('IncomeExpenseLineCard', () => {
  it('draws two distinct series over the same time axis', () => {
    const wrapper = mountCard();
    const [income, expense] = datasets(wrapper);

    expect(income.label).toBe('Ingresos');
    expect(expense.label).toBe('Gastos');
    expect(income.borderColor).not.toBe(expense.borderColor);
    expect(
      wrapper.findComponent({ name: 'Line' }).props('data').labels,
    ).toHaveLength(3);
  });

  it('starts in rate mode showing the total of each interval', () => {
    const wrapper = mountCard();
    const [income, expense] = datasets(wrapper);

    expect(income.data).toEqual([100, 0, 50]);
    expect(expense.data).toEqual([40, 60, 0]);
  });

  it('switches to the cumulative reading without requesting data again', async () => {
    const wrapper = mountCard();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await wrapper.find('[data-test="mode-cumulative"]').trigger('click');
    await wrapper.vm.$nextTick();

    const [income, expense] = datasets(wrapper);
    expect(income.data).toEqual([100, 100, 150]);
    expect(expense.data).toEqual([40, 100, 100]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('goes back to rate mode when the toggle is switched again', async () => {
    const wrapper = mountCard();

    await wrapper.find('[data-test="mode-cumulative"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-test="mode-rate"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(datasets(wrapper)[0].data).toEqual([100, 0, 50]);
  });

  it('labels the axis with hours for an hourly granularity', () => {
    const wrapper = mountCard(
      [
        { bucket: '2026-08-20T15:00:00.000Z', income: 10, expense: 0 },
        { bucket: '2026-08-20T16:00:00.000Z', income: 0, expense: 5 },
      ],
      'hour',
    );

    const labels = wrapper.findComponent({ name: 'Line' }).props('data').labels;
    expect(labels[0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it('labels the axis with months for a monthly granularity', () => {
    const wrapper = mountCard(
      [
        { bucket: '2026-01-01T06:00:00.000Z', income: 10, expense: 0 },
        { bucket: '2026-02-01T06:00:00.000Z', income: 0, expense: 5 },
      ],
      'month',
    );

    const labels = wrapper.findComponent({ name: 'Line' }).props('data').labels;
    expect(labels[0]).toContain('2026');
  });

  it('shows an empty state when the period has no movements', () => {
    const wrapper = mountCard([]);

    expect(wrapper.find('[data-test="line-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="line-chart"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Sin movimientos en este periodo');
  });

  it('shows an empty state when every interval is zero', () => {
    const wrapper = mountCard([
      { bucket: '2026-08-01T06:00:00.000Z', income: 0, expense: 0 },
    ]);

    expect(wrapper.find('[data-test="line-empty"]').exists()).toBe(true);
  });

  it('shows a loading indicator instead of the chart while loading', () => {
    const wrapper = mount(IncomeExpenseLineCard, {
      ...mountOptions,
      props: { points, granularity: 'day', loading: true },
    });

    expect(wrapper.find('[data-test="line-chart"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(
      true,
    );
  });
});
