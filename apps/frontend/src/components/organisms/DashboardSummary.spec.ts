import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('../../services/budgets', () => ({
  budgetsService: {
    list: vi.fn(),
    getByMonth: vi.fn(),
    template: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { categoriesService } from '../../services/categories';
import { budgetsService } from '../../services/budgets';
import { transactionsService } from '../../services/transactions';
import { mountOptions } from '../../test-utils/vuetify';
import type { Budget } from '../../types/budget';
import type { TransactionsSummaryView } from '../../types/summary';
import type { BudgetStatus } from '../../utils/budget';
import BudgetStatusCard from './BudgetStatusCard.vue';
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

const currentBudget: Budget = {
  id: 'budget-2026-08',
  month: '2026-08',
  items: [
    { categoryId: 'c3', type: 'income', amount: 1000 },
    { categoryId: 'c1', type: 'expense', amount: 100 },
  ],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const januaryBudget: Budget = {
  ...currentBudget,
  id: 'budget-2026-01',
  month: '2026-01',
  items: [{ categoryId: 'c1', type: 'expense', amount: 300 }],
};

const septemberBudget: Budget = {
  ...currentBudget,
  id: 'budget-2026-09',
  month: '2026-09',
  items: [{ categoryId: 'c1', type: 'expense', amount: 400 }],
};

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('DashboardSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 25, 12));
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(transactionsService.summary).mockResolvedValue(summary);
    vi.mocked(categoriesService.list).mockResolvedValue([
      { id: 'c1', name: 'Comida', color: '#2E6B4F' },
      { id: 'c3', name: 'Sueldo', color: '#3E7C4F' },
    ]);
    vi.mocked(budgetsService.list).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the categories and the summary on mount', async () => {
    mount(DashboardSummary, mountOptions);
    await flush();

    expect(categoriesService.list).toHaveBeenCalledTimes(1);
    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    expect(budgetsService.list).toHaveBeenCalledWith({
      from: '2026-08',
      to: '2026-08',
      limit: 100,
    });
  });

  it('shows a missing-budget alert for the current month with a link to budgets', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const alert = wrapper.find('[data-test="missing-budget-alert"]');
    const link = wrapper.findComponent({ name: 'VBtn' });

    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('Monthly budget is missing');
    expect(alert.text()).toContain("You haven't created a budget for 2026-08.");
    expect(alert.text()).toContain('2026-08');
    expect(alert.text()).toContain('Create budget');
    expect(link.props('to')).toBe('/budgets');
  });

  it('hides the missing-budget alert when the current month has a budget', async () => {
    vi.mocked(budgetsService.list).mockResolvedValue([currentBudget]);

    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    expect(wrapper.find('[data-test="missing-budget-alert"]').exists()).toBe(false);
  });

  it('renders the period filter and the three charts', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    expect(wrapper.text()).toContain('Gastos por categoría');
    expect(wrapper.text()).toContain('Ingresos por categoría');
    expect(wrapper.text()).toContain('Gastos vs Ingresos');
    expect(wrapper.find('[data-test="period-label"]').text()).toContain('Aug');
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

  it('renders separate income and expense bars and highlights an expense overrun', async () => {
    vi.mocked(budgetsService.list).mockResolvedValue([currentBudget]);

    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const income = wrapper.find('[data-test="budget-income-status"]');
    const expenses = wrapper.find('[data-test="budget-expense-status"]');

    expect(income.exists()).toBe(true);
    expect(expenses.exists()).toBe(true);
    expect(wrapper.find('[data-test="budget-status-card"]').text()).toContain(
      'Budget progress',
    );
    expect(income.text()).toContain('Income');
    expect(expenses.text()).toContain('Expenses');
    expect(wrapper.findAll('[data-test="budget-category-bar"]')).toHaveLength(3);
    expect(income.text()).toContain('Sueldo');
    expect(income.text()).toContain('Planned: $1,000.00');
    expect(income.text()).toContain('Actual: $900.00');
    expect(income.text()).toContain('90%');
    expect(expenses.text()).toContain('Comida');
    expect(expenses.text()).toContain('Uncategorized');
    expect(expenses.text()).toContain('Planned: $100.00');
    expect(expenses.text()).toContain('Actual: $120.00');
    expect(expenses.text()).toContain('Over budget: $20.00');
    expect(expenses.find('.text-error').exists()).toBe(true);
  });

  it('reloads budgets and recomputes status for the selected period', async () => {
    vi.mocked(budgetsService.list)
      .mockResolvedValueOnce([currentBudget])
      .mockResolvedValueOnce([januaryBudget, currentBudget, septemberBudget]);

    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const initialCard = wrapper.findComponent(BudgetStatusCard);
    const initialStatus = initialCard.props('status') as BudgetStatus;
    expect(initialStatus.rows).toContainEqual(
      expect.objectContaining({ categoryId: 'c1', planned: 100 }),
    );

    await wrapper.find('[data-test="preset-year"]').trigger('click');
    await flush();

    expect(budgetsService.list).toHaveBeenNthCalledWith(2, {
      from: '2026-01',
      to: '2026-12',
      limit: 100,
    });

    const selectedCard = wrapper.findComponent(BudgetStatusCard);
    const selectedStatus = selectedCard.props('status') as BudgetStatus;
    expect(selectedCard.props('month')).toBe('2026-01');
    expect(selectedStatus.rows).toContainEqual(
      expect.objectContaining({ categoryId: 'c1', planned: 800 }),
    );
    expect(selectedStatus.missingMonths).toEqual(
      expect.arrayContaining(['2026-02', '2026-03', '2026-10']),
    );
    expect(wrapper.find('[data-test="budget-missing-months"]').text()).toContain(
      '2026-02',
    );
    expect(wrapper.find('[data-test="budget-missing-months"]').text()).toContain(
      'Missing budgets for: 2026-02',
    );
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
  it('compares the budgeted and the actual totals of the period', async () => {
    vi.mocked(budgetsService.list).mockResolvedValue([currentBudget]);

    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    const totals = wrapper.find('[data-test="budget-period-totals"]');
    expect(totals.exists()).toBe(true);
    expect(wrapper.find('[data-test="period-total-planned"]').text()).toBe(
      '$100.00',
    );
    expect(wrapper.find('[data-test="period-total-actual"]').text()).toBe(
      '$200.00',
    );
    expect(
      wrapper.find('[data-test="period-total-difference"]').text(),
    ).toContain('Over budget: $100.00');
    expect(
      wrapper.find('[data-test="period-total-percentage"]').text(),
    ).toContain('200% of the budget');
  });

  it('states that the period has no budget when none was defined', async () => {
    const wrapper = mount(DashboardSummary, mountOptions);
    await flush();

    expect(wrapper.find('[data-test="budget-period-totals"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.find('[data-test="budget-period-totals-empty"]').text(),
    ).toContain('There is no budget defined for this period yet.');
  });
});
