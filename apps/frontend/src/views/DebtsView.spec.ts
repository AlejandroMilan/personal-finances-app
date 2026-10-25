import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', props: ['data', 'options'], template: '<div />' },
  Pie: { name: 'Pie', props: ['data', 'options'], template: '<div />' },
}));

vi.mock('../services/debts', () => ({
  debtsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    movements: vi.fn(),
  },
}));

import { mountOptions } from '../test-utils/vuetify';
import { debtsService } from '../services/debts';
import type { Debt, DebtMovement } from '../types/debt';
import DebtsView from './DebtsView.vue';

const card: Debt = {
  id: 'd1',
  name: 'Card',
  totalAmount: 900,
  revolving: true,
  annualInterestRate: null,
  paymentMode: 'capital',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const payment: DebtMovement = {
  id: 'm1',
  debtId: 'd1',
  kind: 'pago',
  delta: -100,
  amount: 120,
  capitalAmount: 100,
  interestAmount: 20,
  transactionId: 't1',
  occurredAt: '2026-02-01T00:00:00.000Z',
  balanceBefore: 1000,
  balanceAfter: 900,
};

describe('DebtsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(debtsService.list).mockReset().mockResolvedValue([card]);
    vi.mocked(debtsService.movements).mockReset().mockResolvedValue([payment]);
    vi.mocked(debtsService.remove).mockReset().mockResolvedValue(undefined);
  });

  it('loads the debts and shows the total owed', async () => {
    const wrapper = mount(DebtsView, mountOptions);
    await flushPromises();

    expect(debtsService.list).toHaveBeenCalled();
    expect(wrapper.get('[data-test="total-debt"]').text()).toContain('$900.00');
    expect(wrapper.findAll('[data-test="debt-card"]')).toHaveLength(1);
  });

  it('shows the general log with the debt name of each movement', async () => {
    const wrapper = mount(DebtsView, mountOptions);
    await flushPromises();

    const rows = wrapper.findAll('[data-test="ledger-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Card');
    expect(rows[0].text()).toContain('Pago');
  });

  it('renders the pie and evolution charts next to the list', async () => {
    const wrapper = mount(DebtsView, mountOptions);
    await flushPromises();

    expect(wrapper.find('[data-test="evolution-chart"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="distribution-chart"]').exists()).toBe(true);
  });

  it('shows the empty state when there are no debts', async () => {
    vi.mocked(debtsService.list).mockResolvedValue([]);
    vi.mocked(debtsService.movements).mockResolvedValue([]);
    const wrapper = mount(DebtsView, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain('Sin deudas registradas');
    expect(wrapper.text()).toContain('$0.00');
  });

  it('deletes a debt after confirmation', async () => {
    const wrapper = mount(DebtsView, { ...mountOptions, attachTo: document.body });
    await flushPromises();

    await wrapper.get('[data-test="delete-debt"]').trigger('click');
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>('[data-test="confirm-delete-debt"]')!.click();
    await flushPromises();

    expect(debtsService.remove).toHaveBeenCalledWith('d1');
    wrapper.unmount();
    document.body.innerHTML = '';
  });
});
