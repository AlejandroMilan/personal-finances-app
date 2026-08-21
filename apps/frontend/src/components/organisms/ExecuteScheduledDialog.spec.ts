import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../../services/accounts', () => ({
  accountsService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../services/categories', () => ({
  categoriesService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import { useAccountsStore } from '../../stores/accounts';
import type { AccountView } from '../../types/account';
import type { ScheduledTransactionView } from '../../types/scheduled-transaction';
import { toDateInputValue } from '../../utils/schedule';
import ExecuteScheduledDialog from './ExecuteScheduledDialog.vue';

const account = (id: string, name: string): AccountView => ({
  id,
  name,
  balance: 0,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
});

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
  scheduledFor: new Date(2026, 8, 1, 0, 0, 0).toISOString(),
  recurring: true,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

const transferScheduled = scheduled({
  accountId: 'a1',
  destinationAccountId: 'a2',
  categoryId: null,
  type: 'transfer',
  title: 'Move money',
  amount: 125,
});

const mountDialog = (item: ScheduledTransactionView) =>
  mount(ExecuteScheduledDialog, {
    ...mountOptions,
    attachTo: document.body,
    props: { modelValue: false, scheduled: item },
  });

const open = async (wrapper: ReturnType<typeof mountDialog>) => {
  await wrapper.setProps({ modelValue: true });
  await wrapper.vm.$nextTick();
};

const vm = (wrapper: ReturnType<typeof mountDialog>) =>
  wrapper.vm as unknown as {
    confirm: () => Promise<void>;
    close: () => void;
    reschedule: boolean;
    amount: number;
    accountId: string;
    destinationAccountId: string | null;
    destinationAccounts: AccountView[];
  };

const confirmed = (wrapper: ReturnType<typeof mountDialog>) =>
  (wrapper.emitted('confirm') as [[Record<string, unknown>]] | undefined)?.[0][0];

describe('ExecuteScheduledDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('preloads the scheduled amount, account and category, and today as the date', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    await vm(wrapper).confirm();

    expect(confirmed(wrapper)).toMatchObject({
      amount: 12000,
      accountId: 'a1',
      categoryId: 'c1',
    });
    expect(String(confirmed(wrapper)?.timestamp)).toContain(
      toDateInputValue(new Date()),
    );
  });

  it('shows the source and destination for a transfer and keeps the reschedule flow', async () => {
    useAccountsStore().accounts = [
      account('a1', 'Checking'),
      account('a2', 'Savings'),
      account('a3', 'Cash'),
    ];
    const wrapper = mountDialog(transferScheduled);

    await open(wrapper);

    expect(document.body.textContent).toContain('Checking');
    expect(document.body.textContent).toContain('Savings');
    expect(vm(wrapper).accountId).toBe('a1');
    expect(vm(wrapper).destinationAccountId).toBe('a2');
    expect(vm(wrapper).destinationAccounts.map((item) => item.id)).toEqual([
      'a2',
      'a3',
    ]);
    expect(
      document.body.querySelector('[data-test="destination-field"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-test="category-field"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-test="reschedule-switch"]'),
    ).not.toBeNull();

    await vm(wrapper).confirm();

    expect(confirmed(wrapper)).toMatchObject({
      amount: 125,
      accountId: 'a1',
      destinationAccountId: 'a2',
    });
    expect(confirmed(wrapper)).not.toHaveProperty('categoryId');
    expect(String(confirmed(wrapper)?.rescheduleFor)).toContain('2026-10-01');
  });

  it('lets the four fields be edited before confirming', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Monto');
    expect(text).toContain('Fecha');
    expect(text).toContain('Cuenta');
    expect(text).toContain('Categoría');
    expect(
      document.body.querySelector('[data-test="amount-field"] input'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-test="timestamp-field"] input'),
    ).not.toBeNull();
  });

  it('offers the reschedule already on, suggesting one month after the scheduled date', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);

    expect(
      document.body.querySelector('[data-test="reschedule-switch"]'),
    ).not.toBeNull();
    const dateInput = document.body.querySelector<HTMLInputElement>(
      '[data-test="reschedule-date"] input',
    );
    expect(dateInput?.value).toBe('2026-10-01');
  });

  it('hides the reschedule question for a non recurring scheduled transaction', async () => {
    const wrapper = mountDialog(scheduled({ recurring: false }));

    await open(wrapper);

    expect(
      document.body.querySelector('[data-test="reschedule-switch"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-test="reschedule-date"]'),
    ).toBeNull();
  });

  it('sends the reschedule date when the option stays on', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    await vm(wrapper).confirm();

    expect(String(confirmed(wrapper)?.rescheduleFor)).toContain('2026-10-01');
  });

  it('hides the date picker and sends no reschedule when the option is turned off', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    vm(wrapper).reschedule = false;
    await wrapper.vm.$nextTick();

    expect(
      document.body.querySelector('[data-test="reschedule-date"]'),
    ).toBeNull();

    await vm(wrapper).confirm();

    expect(confirmed(wrapper)).not.toHaveProperty('rescheduleFor');
  });

  it('never sends a reschedule for a non recurring scheduled transaction', async () => {
    const wrapper = mountDialog(scheduled({ recurring: false }));

    await open(wrapper);
    await vm(wrapper).confirm();

    expect(confirmed(wrapper)).not.toHaveProperty('rescheduleFor');
  });

  it('clamps the suggested date to the last day of a shorter month', async () => {
    const wrapper = mountDialog(
      scheduled({ scheduledFor: new Date(2026, 0, 31).toISOString() }),
    );

    await open(wrapper);

    const dateInput = document.body.querySelector<HTMLInputElement>(
      '[data-test="reschedule-date"] input',
    );
    expect(dateInput?.value).toBe('2026-02-28');
  });

  it('emits a single confirm event', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    await vm(wrapper).confirm();

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('does not confirm with a non positive amount', async () => {
    const wrapper = mountDialog(scheduled({ amount: 12000 }));

    await open(wrapper);
    vm(wrapper).amount = 0;
    await wrapper.vm.$nextTick();
    await vm(wrapper).confirm();

    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  it('emits nothing when cancelling', async () => {
    const wrapper = mountDialog(scheduled());

    await open(wrapper);
    vm(wrapper).close();

    expect(wrapper.emitted('confirm')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
  });
});
