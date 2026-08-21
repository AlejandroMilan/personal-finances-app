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
import type { TransactionType, TransactionView } from '../../types/transaction';
import TransactionFormDialog from './TransactionFormDialog.vue';

const account = (id: string, name: string): AccountView => ({
  id,
  name,
  balance: 0,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
});

const transfer: TransactionView = {
  id: 't1',
  accountId: 'a1',
  destinationAccountId: 'a2',
  categoryId: null,
  type: 'transfer',
  title: 'Move money',
  amount: 125,
  timestamp: '2026-08-20T12:00:00.000Z',
  tags: [],
};

const mountDialog = (transaction: TransactionView | null = null) =>
  mount(TransactionFormDialog, {
    ...mountOptions,
    attachTo: document.body,
    props: { modelValue: false, transaction },
  });

const open = async (wrapper: ReturnType<typeof mountDialog>) => {
  await wrapper.setProps({ modelValue: true });
  await wrapper.vm.$nextTick();
};

type DialogVm = {
  type: TransactionType;
  accountId: string;
  destinationAccountId: string | null;
  title: string;
  amount: number;
  destinationAccounts: AccountView[];
  typeOptions: { value: TransactionType; label: string }[];
  save: () => Promise<void>;
};

const vm = (wrapper: ReturnType<typeof mountDialog>) =>
  wrapper.vm as unknown as DialogVm;

describe('TransactionFormDialog transfer fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('offers Transfer as a transaction type', async () => {
    const wrapper = mountDialog();

    await open(wrapper);

    expect(vm(wrapper).typeOptions).toContainEqual({
      value: 'transfer',
      label: 'Transfer',
    });
  });

  it('shows the destination selector and hides category for transfers', async () => {
    const wrapper = mountDialog();

    await open(wrapper);
    vm(wrapper).type = 'transfer';
    await wrapper.vm.$nextTick();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Destination account');
    expect(text).not.toContain('Category');
  });

  it('filters out the source and disables save until a destination is selected', async () => {
    const accounts = useAccountsStore();
    accounts.accounts = [account('a1', 'Checking'), account('a2', 'Savings'), account('a3', 'Cash')];
    const wrapper = mountDialog();

    await open(wrapper);
    vm(wrapper).type = 'transfer';
    await wrapper.vm.$nextTick();

    expect(vm(wrapper).destinationAccounts.map((item) => item.id)).toEqual(['a2', 'a3']);
    const saveButton = document.body.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(saveButton?.disabled).toBe(true);

    vm(wrapper).destinationAccountId = 'a2';
    await wrapper.vm.$nextTick();

    expect(saveButton?.disabled).toBe(false);
  });

  it('emits a transfer payload without a category', async () => {
    const accounts = useAccountsStore();
    accounts.accounts = [account('a1', 'Checking'), account('a2', 'Savings')];
    const wrapper = mountDialog();

    await open(wrapper);
    vm(wrapper).type = 'transfer';
    vm(wrapper).title = 'Move money';
    vm(wrapper).amount = 125;
    vm(wrapper).destinationAccountId = 'a2';
    await wrapper.vm.$nextTick();
    await vm(wrapper).save();

    const [[payload]] = wrapper.emitted('save') as [[Record<string, unknown>]];
    expect(payload).toMatchObject({
      type: 'transfer',
      accountId: 'a1',
      destinationAccountId: 'a2',
    });
    expect(payload).not.toHaveProperty('categoryId');
  });

  it('preloads a transfer destination and keeps the type immutable while editing', async () => {
    const accounts = useAccountsStore();
    accounts.accounts = [account('a1', 'Checking'), account('a2', 'Savings')];
    const wrapper = mountDialog(transfer);

    await open(wrapper);

    expect(vm(wrapper).type).toBe('transfer');
    expect(vm(wrapper).destinationAccountId).toBe('a2');
    expect(document.body.textContent).not.toContain('Category');

    const typeSelect = wrapper
      .findAllComponents({ name: 'VSelect' })
      .find((select) => select.props('label') === 'Type');
    expect(typeSelect?.props('disabled')).toBe(true);
  });
});
