import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { Debt, DebtMovement } from '../../types/debt';
import DebtLedgerTable from './DebtLedgerTable.vue';

const debts: Debt[] = [
  {
    id: 'd1',
    name: 'Card',
    totalAmount: 900,
    revolving: true,
    annualInterestRate: null,
    paymentMode: 'capital',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

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

describe('DebtLedgerTable', () => {
  it('shows each movement with its kind, amounts and resulting balance', () => {
    const wrapper = mount(DebtLedgerTable, {
      ...mountOptions,
      props: { movements: [payment], debts, showDebt: false },
    });

    const row = wrapper.get('[data-test="ledger-row"]').text();
    expect(row).toContain('Pago');
    expect(row).toContain('$120.00');
    expect(row).toContain('$100.00');
    expect(row).toContain('$20.00');
    expect(row).toContain('$900.00');
    expect(wrapper.text()).not.toContain('Deuda');
  });

  it('names the debt of each row in the general log', () => {
    const wrapper = mount(DebtLedgerTable, {
      ...mountOptions,
      props: { movements: [payment], debts, showDebt: true },
    });

    expect(wrapper.find('th').text()).toBe('Fecha');
    expect(wrapper.text()).toContain('Card');
  });

  it('shows an empty state without movements', () => {
    const wrapper = mount(DebtLedgerTable, {
      ...mountOptions,
      props: { movements: [], debts, showDebt: true },
    });

    expect(wrapper.find('[data-test="ledger-empty"]').exists()).toBe(true);
  });
});
