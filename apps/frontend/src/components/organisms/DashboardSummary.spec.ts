import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-chartjs', () => ({
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<div data-test="donut-chart" />',
  },
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div data-test="line-chart" />',
  },
}));

vi.mock('../../services/transactions', () => ({
  transactionsService: {
    summary: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../services/categories', () => ({
  categoriesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { categoriesService } from '../../services/categories';
import { transactionsService } from '../../services/transactions';
import { mountOptions } from '../../test-utils/vuetify';
import type { TransactionsSummaryView } from '../../types/summary';
import DashboardSummary from './DashboardSummary.vue';

const summary: TransactionsSummaryView = {
  from: '2026-08-01T06:00:00.000Z',
  to: '2026-09-01T05:59:59.999Z',
  granularity: 'day',
  timeZone: 'America/Mexico_City',
  totals: { income: 900, expense: 200 },
  byCategory: {
    income: [{ categoryId: 'c3', total: 900 }],
    expense: [
      { categoryId: 'c1', total: 120 },
      { categoryId: null, total: 80 },
    ],
  },
  series: [
    { bucket: '2026-08-01T06:00:00.000Z', income: 900, expense: 120 },
    { bucket: '2026-08-02T06:00:00.000Z', income: 0, expense: 80 },
  ],
};

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('DashboardSummary', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(transactionsService.summary).mockResolvedValue(summary);
    vi.mocked(categoriesService.list).mockResolvedValue([
      { id: 'c1', name: 'Comida', color: '#2E6B4F' },
      { id: 'c3', name: 'Sueldo', color: '#3E7C4F' },
    ]);
  });

  it('loads the categories and the summary on mount', async () => {
    mount(DashboardSummary, mountOptions);
    await flush();

    expect(categoriesService.list).toHaveBeenCalledTimes(1);
    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
  });

  it('renders the period filter and the three charts', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    expect(wrapper.text()).toContain('Gastos por categoría');
    expect(wrapper.text()).toContain('Ingresos por categoría');
    expect(wrapper.text()).toContain('Gastos vs Ingresos');
    expect(wrapper.find('[data-test="preset-month"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="donut-chart"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="line-chart"]').exists()).toBe(true);
  });

  it('resolves category names and keeps the uncategorised group', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const legends = wrapper.findAll('[data-test="donut-legend"]');
    expect(legends[0].text()).toContain('Comida');
    expect(legends[0].text()).toContain('Sin categoría');
    expect(legends[1].text()).toContain('Sueldo');
  });

  it('updates the three charts with a single request when the period changes', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();
    vi.mocked(transactionsService.summary).mockClear();

    await wrapper.find('[data-test="preset-year"]').trigger('click');
    await flush();

    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    expect(vi.mocked(transactionsService.summary).mock.calls[0][0].granularity).toBe(
      'month',
    );
    expect(wrapper.find('[data-test="period-label"]').exists()).toBe(true);
  });

  it('stacks the donuts on mobile and places them side by side on desktop', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const columns = wrapper.findAllComponents({ name: 'VCol' });
    const layout = columns.map((column) => ({
      cols: column.props('cols'),
      md: column.props('md'),
    }));

    // Las dos donas ocupan media fila en escritorio y la fila entera en móvil;
    // la línea siempre ocupa el ancho completo.
    expect(layout).toEqual([
      { cols: '12', md: '6' },
      { cols: '12', md: '6' },
      { cols: '12', md: false },
    ]);
  });

  it('shows loading indicators instead of stale data while fetching', async () => {
    let resolveSummary: (value: TransactionsSummaryView) => void = () => {};
    vi.mocked(transactionsService.summary).mockReturnValue(
      new Promise<TransactionsSummaryView>((resolve) => {
        resolveSummary = resolve;
      }),
    );

    const wrapper = mount(DashboardSummary, mountOptions);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents({ name: 'VProgressCircular' }).length).toBe(
      3,
    );
    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);

    resolveSummary(summary);
    await flush();

    expect(wrapper.findAll('[data-test="donut-chart"]')).toHaveLength(2);
  });

  it('surfaces the error returned by the store', async () => {
    vi.mocked(transactionsService.summary).mockRejectedValue(
      new Error('Network down'),
    );

    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    expect(wrapper.find('[data-test="dashboard-error"]').text()).toContain(
      'Network down',
    );
  });
});
