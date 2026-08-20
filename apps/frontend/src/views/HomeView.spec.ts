import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-chartjs', () => ({
  Doughnut: { name: 'Doughnut', props: ['data', 'options'], template: '<div />' },
  Line: { name: 'Line', props: ['data', 'options'], template: '<div />' },
}));

vi.mock('../services/transactions', () => ({
  transactionsService: { summary: vi.fn(), list: vi.fn() },
}));

vi.mock('../services/categories', () => ({
  categoriesService: { list: vi.fn() },
}));

import { categoriesService } from '../services/categories';
import { transactionsService } from '../services/transactions';
import { mountOptions } from '../test-utils/vuetify';
import HomeView from './HomeView.vue';

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(categoriesService.list).mockResolvedValue([]);
    vi.mocked(transactionsService.summary).mockResolvedValue({
      from: '2026-08-01T06:00:00.000Z',
      to: '2026-09-01T05:59:59.999Z',
      granularity: 'day',
      timeZone: 'UTC',
      totals: { income: 0, expense: 0 },
      byCategory: { income: [], expense: [] },
      series: [],
    });
  });

  it('no longer renders the hello world placeholder', async () => {
    const wrapper = mount(HomeView, mountOptions);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.text()).not.toContain('Hello World');
  });

  it('renders the dashboard with its period filter and charts', async () => {
    const wrapper = mount(HomeView, mountOptions);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.text()).toContain('Resumen');
    expect(wrapper.text()).toContain('Gastos por categoría');
    expect(wrapper.text()).toContain('Ingresos por categoría');
    expect(wrapper.text()).toContain('Gastos vs Ingresos');
    expect(wrapper.find('[data-test="preset-month"]').exists()).toBe(true);
  });
});
