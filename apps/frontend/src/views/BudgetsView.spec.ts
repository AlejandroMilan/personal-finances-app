import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/budgets', () => ({
  budgetsService: {
    list: vi.fn(),
    getByMonth: vi.fn(),
    template: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/categories', () => ({
  categoriesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/transactions', () => ({
  transactionsService: {
    summary: vi.fn(),
  },
}));

import BudgetFormDialog from '../components/organisms/BudgetFormDialog.vue';
import { categoriesService } from '../services/categories';
import { budgetsService } from '../services/budgets';
import { transactionsService } from '../services/transactions';
import { mountOptions } from '../test-utils/vuetify';
import type { CategoryView } from '../types/category';
import type { Budget, BudgetItem, CreateBudgetPayload } from '../types/budget';
import type { TransactionsSummaryView } from '../types/summary';
import { monthKey } from '../utils/budget';
import router from '../router';
import BudgetsView from './BudgetsView.vue';

const categories: CategoryView[] = [
  { id: 'c1', name: 'Vivienda', color: '#2E6B4F' },
  { id: 'c2', name: 'Sueldo', color: '#7FA56E' },
];

const item: BudgetItem = {
  categoryId: 'c1',
  type: 'expense',
  amount: 100,
  note: 'Renta',
};

const monthAt = (offset: number): string => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return monthKey(date);
};

const budget = (month: string, items: BudgetItem[] = [item]): Budget => ({
  id: `budget-${month}`,
  month,
  items,
  createdAt: `${month}-01T00:00:00.000Z`,
  updatedAt: `${month}-01T00:00:00.000Z`,
});

type SummaryQuery = Parameters<typeof transactionsService.summary>[0];

const summaryFor = (
  query: SummaryQuery,
  expense = 0,
): TransactionsSummaryView => ({
  from: query.from.toISOString(),
  to: query.to.toISOString(),
  granularity: query.granularity,
  timeZone: query.timeZone,
  totals: { income: 0, expense },
  byCategory: {
    income: [],
    expense: expense > 0 ? [{ categoryId: 'c1', total: expense }] : [],
  },
  series: [],
});

const mountView = async () => {
  const wrapper = mount(BudgetsView, mountOptions);
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
};

describe('BudgetsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';

    vi.mocked(categoriesService.list).mockResolvedValue(categories);
    vi.mocked(budgetsService.list).mockResolvedValue([]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(null);
    vi.mocked(budgetsService.template).mockResolvedValue([]);
    vi.mocked(budgetsService.create).mockImplementation(async (payload) =>
      budget(payload.month, payload.items),
    );
    vi.mocked(budgetsService.update).mockImplementation(async (month, payload) =>
      budget(month, payload.items),
    );
    vi.mocked(transactionsService.summary).mockImplementation(async (query) =>
      summaryFor(query),
    );
  });

  it('registers /budgets as a protected route', () => {
    const route = router.getRoutes().find((entry) => entry.path === '/budgets');

    expect(route).toBeDefined();
    expect(route?.name).toBe('budgets');
    expect(route?.meta.requiresAuth).toBe(true);
  });

  it('redirects unauthenticated visitors from /budgets to login', async () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');

    await router.push('/login');
    await router.push('/budgets');

    expect(router.currentRoute.value.name).toBe('login');
  });

  it('loads the selected budget and renders progress calculated from the actual summary', async () => {
    const current = monthAt(0);
    const saved = budget(current);
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);
    vi.mocked(transactionsService.summary).mockImplementation(async (query) =>
      summaryFor(query, 75),
    );

    const wrapper = await mountView();

    expect(budgetsService.list).toHaveBeenCalledTimes(1);
    expect(budgetsService.getByMonth).toHaveBeenCalledWith(current);
    expect(categoriesService.list).toHaveBeenCalledTimes(1);
    expect(wrapper.find('h1').text()).toBe('Budgets');
    expect(wrapper.text()).toContain('Plan your income and expenses by month.');
    expect(wrapper.find('[data-test="selected-budget"]').text()).toContain(
      'Budget created',
    );
    expect(wrapper.find('[data-test="new-budget"]').text()).toContain('Edit budget');
    expect(wrapper.find('[data-test="budget-status-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Vivienda');
    expect(wrapper.text()).toContain('75%');
    expect(wrapper.text()).toContain('Remaining: $25.00');
  });

  it('renders English labels for saved item counts and budget details', async () => {
    const current = monthAt(0);
    const previous = monthAt(-1);
    const saved = budget(current, [
      item,
      { categoryId: 'c2', type: 'income', amount: 2000, note: 'Salary' },
      { categoryId: 'missing', type: 'expense', amount: 50, note: 'Orphaned' },
    ]);
    const previousBudget = budget(previous);
    vi.mocked(budgetsService.list).mockResolvedValue([saved, previousBudget]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);

    const wrapper = await mountView();
    const savedRows = wrapper.findAll('[data-test="saved-budget"]').map((row) => row.text());

    expect(savedRows).toEqual(
      expect.arrayContaining([
        expect.stringContaining('1 item'),
        expect.stringContaining('3 items'),
      ]),
    );
    const details = wrapper.find('[data-test="budget-items-list"]').text();
    expect(details).toContain('Expense · Renta');
    expect(details).toContain('Income · Salary');
    expect(details).toContain('Deleted category');
    expect(wrapper.find('[data-test="edit-budget"]').text()).toContain('Edit items');
  });

  it('renders the English empty state for a saved budget without items', async () => {
    const current = monthAt(0);
    const saved = budget(current, []);
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);

    const wrapper = await mountView();

    expect(wrapper.find('[data-test="budget-items-list"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="selected-budget"]').text()).toContain(
      'This budget has no items.',
    );
  });

  it('renders English copy for an unsaved month', async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('Choose month');
    expect(wrapper.text()).toContain('Budget month');
    expect(wrapper.text()).toContain('You can also choose a future month');
    expect(wrapper.text()).toContain('Saved budgets');
    expect(wrapper.text()).toContain('No saved months yet.');
    expect(wrapper.find('[data-test="new-budget"]').text()).toContain('Create budget');
    expect(wrapper.text()).toContain('Selected period');
    expect(wrapper.text()).toContain('No budget');
    expect(wrapper.text()).toContain(
      'Create this budget to get a proposal based on your schedule.',
    );
    expect(wrapper.text()).toContain('Create from schedule');
  });

  it('lets the user select a future month and loads its agenda template with notes', async () => {
    const future = monthAt(1);
    const template: BudgetItem[] = [
      { categoryId: 'c1', type: 'expense', amount: 1200, note: 'Renta (agenda)' },
    ];
    vi.mocked(budgetsService.template).mockResolvedValue(template);

    const wrapper = await mountView();
    const monthInput = wrapper.find('[data-test="month-selector"] input');

    expect(monthInput.exists()).toBe(true);
    await monthInput.setValue(future);
    await flushPromises();

    expect(budgetsService.getByMonth).toHaveBeenLastCalledWith(future);
    expect(wrapper.find('[data-test="budget-state"]').text()).toContain(
      'No budget',
    );

    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    await flushPromises();

    expect(budgetsService.template).toHaveBeenCalledWith(future);
    const form = wrapper.findComponent(BudgetFormDialog);
    expect(form.props('modelValue')).toBe(true);
    expect(form.props('month')).toBe(future);
    expect(form.props('items')).toEqual(template);
    expect(
      document.body.querySelector<HTMLInputElement>('[data-test="budget-item-note"] input')
        ?.value,
    ).toBe('Renta (agenda)');
  });

  it('opens an existing month for local editing without requesting a template', async () => {
    const current = monthAt(0);
    const saved = budget(current);
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    await flushPromises();

    expect(budgetsService.template).not.toHaveBeenCalled();
    expect(wrapper.findComponent(BudgetFormDialog).props('items')).toEqual([item]);
  });

  it('saves only the edited rows for an existing budget and closes the dialog', async () => {
    const current = monthAt(0);
    const saved = budget(current);
    const payload: CreateBudgetPayload = {
      month: current,
      items: [{ categoryId: 'c1', type: 'expense', amount: 80, note: 'Edited' }],
    };
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    const form = wrapper.findComponent(BudgetFormDialog);
    form.vm.$emit('save', payload);
    await flushPromises();

    expect(budgetsService.update).toHaveBeenCalledWith(current, {
      items: payload.items,
    });
    expect(budgetsService.create).not.toHaveBeenCalled();
    expect(form.props('modelValue')).toBe(false);
    expect(wrapper.find('[data-test="selected-budget"]').text()).toContain(
      '$80.00',
    );
  });

  it('creates a future budget from the rows left in the dialog', async () => {
    const future = monthAt(1);
    const payload: CreateBudgetPayload = {
      month: future,
      items: [{ categoryId: 'c2', type: 'income', amount: 3000 }],
    };
    vi.mocked(budgetsService.template).mockResolvedValue([item]);

    const wrapper = await mountView();
    await wrapper.find('[data-test="month-selector"] input').setValue(future);
    await flushPromises();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    await flushPromises();

    wrapper.findComponent(BudgetFormDialog).vm.$emit('save', payload);
    await flushPromises();

    expect(budgetsService.create).toHaveBeenCalledWith(payload);
    expect(wrapper.find('[data-test="budget-state"]').text()).toContain(
      'Budget created',
    );
    expect(wrapper.findAll('[data-test="saved-budget"]')).toHaveLength(1);
  });

  it('surfaces a template failure in the page', async () => {
    vi.mocked(budgetsService.template).mockRejectedValue(new Error('Template down'));

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="budget-action-error"]').text()).toContain(
      'Template down',
    );
  });

  it('renders the English store fallback for a non-Error month failure', async () => {
    vi.mocked(budgetsService.getByMonth).mockRejectedValue('Month down');

    const wrapper = await mountView();

    expect(wrapper.find('[data-test="budget-load-error"]').text()).toBe(
      'Could not load the budget',
    );
  });

  it('uses the English fallback when preparing a budget fails with a non-Error', async () => {
    vi.mocked(budgetsService.template).mockRejectedValue('Template down');

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="budget-action-error"]').text()).toBe(
      'Could not prepare the budget',
    );
  });

  it('surfaces a save failure in the page', async () => {
    const current = monthAt(0);
    const saved = budget(current);
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);
    vi.mocked(budgetsService.update).mockRejectedValue(new Error('Save down'));

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    const form = wrapper.findComponent(BudgetFormDialog);
    form.vm.$emit('save', {
      month: current,
      items: [item],
    });
    await flushPromises();

    expect(wrapper.find('[data-test="budget-action-error"]').text()).toContain(
      'Save down',
    );
  });

  it('uses the English fallback when saving fails with a non-Error', async () => {
    const current = monthAt(0);
    const saved = budget(current);
    vi.mocked(budgetsService.list).mockResolvedValue([saved]);
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(saved);
    vi.mocked(budgetsService.update).mockRejectedValue('Save down');

    const wrapper = await mountView();
    await wrapper.find('[data-test="edit-budget"]').trigger('click');
    const form = wrapper.findComponent(BudgetFormDialog);
    form.vm.$emit('save', {
      month: current,
      items: [item],
    });
    await flushPromises();

    expect(wrapper.find('[data-test="budget-action-error"]').text()).toBe(
      'Could not save the budget',
    );
  });
});
