import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import MissingBudgetAlert from './MissingBudgetAlert.vue';

describe('MissingBudgetAlert', () => {
  it('shows the missing month and links directly to the budgets page', () => {
    const wrapper = mount(MissingBudgetAlert, {
      ...mountOptions,
      props: { month: '2026-08' },
    });

    const link = wrapper.findComponent({ name: 'VBtn' });

    expect(wrapper.find('[data-test="missing-budget-alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Monthly budget is missing');
    expect(wrapper.text()).toContain("You haven't created a budget for 2026-08.");
    expect(wrapper.text()).toContain('2026-08');
    expect(link.text()).toContain('Create budget');
    expect(link.props('to')).toBe('/budgets');
  });
});
