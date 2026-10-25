import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div data-test="evolution-chart" />',
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import type { Debt, DebtMovement } from '../../types/debt';
import DebtEvolutionChart from './DebtEvolutionChart.vue';

const debt = (id: string, name: string): Debt => ({
  id,
  name,
  totalAmount: 0,
  revolving: false,
  annualInterestRate: null,
  paymentMode: 'capital',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const movement = (
  id: string,
  debtId: string,
  occurredAt: string,
  balanceAfter: number,
): DebtMovement => ({
  id,
  debtId,
  kind: 'pago',
  delta: 0,
  amount: 0,
  capitalAmount: 0,
  interestAmount: 0,
  transactionId: null,
  occurredAt,
  balanceBefore: 0,
  balanceAfter,
});

const movements = [
  movement('1', 'a', '2026-01-01T00:00:00.000Z', 1000),
  movement('2', 'b', '2026-01-10T00:00:00.000Z', 200),
  movement('3', 'a', '2026-02-01T00:00:00.000Z', 900),
];

describe('DebtEvolutionChart', () => {
  it('plots the total balance over time by default', () => {
    const wrapper = mount(DebtEvolutionChart, {
      ...mountOptions,
      props: { movements, debts: [debt('a', 'Card'), debt('b', 'Car')] },
    });

    const data = wrapper.findComponent({ name: 'Line' }).props('data') as {
      datasets: { data: number[] }[];
    };
    expect(data.datasets[0].data).toEqual([1000, 1200, 1100]);
  });

  it('switches to the balance of a single debt from the selector', async () => {
    const wrapper = mount(DebtEvolutionChart, {
      ...mountOptions,
      props: { movements, debts: [debt('a', 'Card'), debt('b', 'Car')] },
    });

    wrapper.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', 'a');
    await wrapper.vm.$nextTick();

    const data = wrapper.findComponent({ name: 'Line' }).props('data') as {
      datasets: { data: number[] }[];
    };
    expect(data.datasets[0].data).toEqual([1000, 900]);
  });

  it('shows an empty state without debt movements', () => {
    const wrapper = mount(DebtEvolutionChart, {
      ...mountOptions,
      props: { movements: [], debts: [] },
    });

    expect(wrapper.find('[data-test="evolution-empty"]').exists()).toBe(true);
  });
});
