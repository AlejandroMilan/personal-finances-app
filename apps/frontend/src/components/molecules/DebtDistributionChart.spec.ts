import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-chartjs', () => ({
  Pie: {
    name: 'Pie',
    props: ['data', 'options'],
    template: '<div data-test="distribution-chart" />',
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import type { Debt } from '../../types/debt';
import DebtDistributionChart from './DebtDistributionChart.vue';

const debt = (id: string, name: string, totalAmount: number): Debt => ({
  id,
  name,
  totalAmount,
  revolving: false,
  annualInterestRate: null,
  paymentMode: 'capital',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('DebtDistributionChart', () => {
  it('feeds the pie one slice per debt with its amount', () => {
    const wrapper = mount(DebtDistributionChart, {
      ...mountOptions,
      props: { debts: [debt('a', 'Card', 300), debt('b', 'Car', 100)] },
    });

    const chart = wrapper.findComponent({ name: 'Pie' });
    const data = chart.props('data') as {
      labels: string[];
      datasets: { data: number[] }[];
    };
    expect(data.labels).toEqual(['Card', 'Car']);
    expect(data.datasets[0].data).toEqual([300, 100]);
  });

  it('shows an empty state instead of an empty chart when there are no debts', () => {
    const wrapper = mount(DebtDistributionChart, {
      ...mountOptions,
      props: { debts: [] },
    });

    expect(wrapper.find('[data-test="distribution-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="distribution-chart"]').exists()).toBe(false);
  });
});
