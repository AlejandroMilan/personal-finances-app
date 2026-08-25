import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { BudgetStatusRow } from '../../utils/budget';
import BudgetCategoryBar from './BudgetCategoryBar.vue';

const row = (overrides: Partial<BudgetStatusRow> = {}): BudgetStatusRow => ({
  categoryId: 'c1',
  type: 'expense',
  planned: 100,
  actual: 75,
  ratio: 0.75,
  remaining: 25,
  unbudgeted: false,
  ...overrides,
});

const mountBar = (overrides: Partial<BudgetStatusRow> = {}) =>
  mount(BudgetCategoryBar, {
    ...mountOptions,
    props: { row: row(overrides), categoryName: 'Vivienda' },
  });

describe('BudgetCategoryBar', () => {
  it('shows the category, type, percentage and currency amounts', () => {
    const wrapper = mountBar();

    expect(wrapper.text()).toContain('Vivienda');
    expect(wrapper.text()).toContain('Expense');
    expect(wrapper.text()).toContain('75%');
    expect(wrapper.text()).toContain('Planned: $100.00');
    expect(wrapper.text()).toContain('Actual: $75.00');
    expect(wrapper.text()).toContain('Remaining: $25.00');
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).attributes('aria-label')).toBe(
      'Budget progress',
    );

    const progress = wrapper.findComponent({ name: 'VProgressLinear' });
    expect(progress.props('modelValue')).toBe(75);
    expect(progress.props('color')).toBe('primary');
  });

  it('renders income progress with the income theme token', () => {
    const wrapper = mountBar({
      type: 'income',
      planned: 1000,
      actual: 900,
      ratio: 0.9,
      remaining: 100,
    });

    expect(wrapper.text()).toContain('Income');
    expect(wrapper.text()).toContain('90%');
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).props('color')).toBe(
      'info',
    );
  });

  it('clamps an over-budget percentage and marks the excess as an error', () => {
    const wrapper = mountBar({
      actual: 150,
      ratio: 1.5,
      remaining: -50,
    });

    expect(wrapper.text()).toContain('100%');
    expect(wrapper.text()).toContain('Over budget: $50.00');
    expect(wrapper.find('.text-error').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).props('modelValue')).toBe(
      100,
    );
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).props('color')).toBe(
      'error',
    );
  });

  it('shows zero progress when no positive amount was planned', () => {
    const wrapper = mountBar({
      planned: 0,
      actual: 40,
      ratio: 0,
      remaining: -40,
      unbudgeted: true,
    });

    expect(wrapper.text()).toContain('0%');
    expect(wrapper.text()).toContain('Over budget: $40.00');
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).props('modelValue')).toBe(
      0,
    );
  });
});
