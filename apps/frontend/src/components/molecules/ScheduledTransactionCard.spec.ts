import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { ScheduledTransactionView } from '../../types/scheduled-transaction';
import ScheduledTransactionCard from './ScheduledTransactionCard.vue';

const scheduled = (
  overrides: Partial<ScheduledTransactionView> = {},
): ScheduledTransactionView => ({
  id: 's1',
  accountId: 'a1',
  destinationAccountId: null,
  categoryId: 'c1',
  type: 'expense',
  title: 'Renta',
  amount: 12000,
  tags: [],
  scheduledFor: futureDate(),
  recurring: false,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

function futureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return date.toISOString();
}

function pastDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 10);
  return date.toISOString();
}

const mountCard = (item: ScheduledTransactionView, props = {}) =>
  mount(ScheduledTransactionCard, {
    ...mountOptions,
    props: { scheduled: item, ...props },
  });

describe('ScheduledTransactionCard', () => {
  it('shows the title, account, category and date', () => {
    const wrapper = mountCard(scheduled(), {
      accountName: 'BBVA',
      categoryName: 'Vivienda',
    });

    expect(wrapper.text()).toContain('Renta');
    expect(wrapper.text()).toContain('BBVA');
    expect(wrapper.text()).toContain('Vivienda');
  });

  it('shows an expense with a negative sign', () => {
    expect(mountCard(scheduled()).text()).toContain('-$12,000.00');
  });

  it('shows an income with a positive sign', () => {
    const wrapper = mountCard(scheduled({ type: 'income', amount: 25000 }));

    expect(wrapper.text()).toContain('+$25,000.00');
  });

  it('shows a transfer from source to destination with a neutral amount', () => {
    const wrapper = mountCard(
      scheduled({
        type: 'transfer',
        destinationAccountId: 'a2',
        categoryId: null,
        amount: 125,
      }),
      {
        accountName: 'Checking',
        destinationName: 'Savings',
        categoryName: 'Ignored category',
      },
    );

    expect(wrapper.text()).toContain('Checking → Savings');
    expect(wrapper.text()).toContain('$125.00');
    expect(wrapper.text()).not.toContain('+$125.00');
    expect(wrapper.text()).not.toContain('-$125.00');
    expect(wrapper.text()).not.toContain('Ignored category');
  });

  it('marks a pending scheduled transaction with a past date as overdue', () => {
    const wrapper = mountCard(scheduled({ scheduledFor: pastDate() }));

    expect(wrapper.find('[data-test="overdue-chip"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="scheduled-card-overdue"]').exists()).toBe(
      true,
    );
  });

  it('does not mark a future date as overdue', () => {
    const wrapper = mountCard(scheduled());

    expect(wrapper.find('[data-test="overdue-chip"]').exists()).toBe(false);
  });

  it('does not mark an executed past scheduled transaction as overdue', () => {
    const wrapper = mountCard(
      scheduled({ scheduledFor: pastDate(), status: 'executed' }),
    );

    expect(wrapper.find('[data-test="overdue-chip"]').exists()).toBe(false);
  });

  it('flags a recurring scheduled transaction', () => {
    expect(mountCard(scheduled({ recurring: true })).text()).toContain(
      'Recurrente',
    );
  });

  it.each([
    ['pending', 'Pendiente'],
    ['executed', 'Ejecutada'],
    ['cancelled', 'Cancelada'],
  ] as const)('labels the %s status as %s', (status, label) => {
    expect(mountCard(scheduled({ status })).text()).toContain(label);
  });

  it('only offers the actions while it is pending', () => {
    expect(
      mountCard(scheduled()).find('[data-test="pending-actions"]').exists(),
    ).toBe(true);
    expect(
      mountCard(scheduled({ status: 'executed' }))
        .find('[data-test="pending-actions"]')
        .exists(),
    ).toBe(false);
    expect(
      mountCard(scheduled({ status: 'cancelled' }))
        .find('[data-test="pending-actions"]')
        .exists(),
    ).toBe(false);
  });

  it('hides edit and delete in compact mode', () => {
    const wrapper = mountCard(scheduled(), { compact: true });

    expect(wrapper.find('[data-test="execute-action"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="cancel-action"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="edit-action"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delete-action"]').exists()).toBe(false);
  });

  it.each([
    ['execute-action', 'execute'],
    ['cancel-action', 'cancel'],
    ['edit-action', 'edit'],
    ['delete-action', 'delete'],
  ])('emits %s as the %s event instead of calling a store', async (
    testId,
    event,
  ) => {
    const wrapper = mountCard(scheduled());

    await wrapper.find(`[data-test="${testId}"]`).trigger('click');

    expect(wrapper.emitted(event)).toHaveLength(1);
  });
});
