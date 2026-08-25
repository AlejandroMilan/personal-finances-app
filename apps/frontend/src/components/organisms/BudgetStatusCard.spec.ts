import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { CategoryView } from '../../types/category';
import type { BudgetStatus } from '../../utils/budget';
import BudgetStatusCard from './BudgetStatusCard.vue';

const categories: CategoryView[] = [
  { id: 'income-category', name: 'Sueldo', color: '#2E6B4F' },
  { id: 'expense-category', name: 'Vivienda', color: '#7FA56E' },
];

const status: BudgetStatus = {
  missingMonths: ['2026-09'],
  rows: [
    {
      categoryId: 'income-category',
      type: 'income',
      planned: 2000,
      actual: 1800,
      ratio: 0.9,
      remaining: 200,
      unbudgeted: false,
    },
    {
      categoryId: 'expense-category',
      type: 'expense',
      planned: 1000,
      actual: 1200,
      ratio: 1.2,
      remaining: -200,
      unbudgeted: false,
    },
    {
      categoryId: null,
      type: 'expense',
      planned: 0,
      actual: 50,
      ratio: 0,
      remaining: -50,
      unbudgeted: true,
    },
    {
      categoryId: 'deleted-category',
      type: 'expense',
      planned: 100,
      actual: 20,
      ratio: 0.2,
      remaining: 80,
      unbudgeted: false,
    },
  ],
};

const mountCard = (props: Partial<InstanceType<typeof BudgetStatusCard>['$props']> = {}) =>
  mount(BudgetStatusCard, {
    ...mountOptions,
    props: {
      month: '2026-09',
      status,
      categories,
      loading: false,
      ...props,
    },
  });

describe('BudgetStatusCard', () => {
  it('shows loading instead of stale status rows while the period is loading', () => {
    const wrapper = mountCard({ loading: true });

    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(true);
    expect(wrapper.find('[data-test="budget-income-status"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="budget-category-bar"]').exists()).toBe(false);
  });

  it('separates income and expenses, shows missing months, and resolves category names', () => {
    const wrapper = mountCard();

    expect(wrapper.text()).toContain('Budget progress');
    expect(wrapper.text()).toContain('2026-09');
    expect(wrapper.find('[data-test="budget-missing-months"]').text()).toContain(
      'Missing budgets for: 2026-09',
    );
    expect(wrapper.find('[data-test="budget-income-status"]').text()).toContain('Sueldo');
    expect(wrapper.find('[data-test="budget-income-status"]').text()).toContain('Income');
    expect(wrapper.find('[data-test="budget-expense-status"]').text()).toContain(
      'Vivienda',
    );
    expect(wrapper.find('[data-test="budget-expense-status"]').text()).toContain('Expenses');
    expect(wrapper.find('[data-test="budget-expense-status"]').text()).toContain(
      'Uncategorized',
    );
    expect(wrapper.find('[data-test="budget-expense-status"]').text()).toContain(
      'Deleted category',
    );
    expect(wrapper.findAll('[data-test="budget-category-bar"]')).toHaveLength(4);
  });

  it('shows an empty state when there is no status for the selected period', () => {
    const wrapper = mountCard({ status: null });

    expect(wrapper.text()).toContain('No actual data for this period.');
    expect(wrapper.find('[data-test="budget-category-bar"]').exists()).toBe(false);
  });

  it('shows an empty comparison when the status has no rows', () => {
    const wrapper = mountCard({ status: { rows: [], missingMonths: [] } });

    expect(wrapper.text()).toContain(
      'There are no actual transactions or budget items to compare yet.',
    );
  });

  it('renders the supplied status without making an HTTP request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    mountCard();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
