import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/transactions', () => ({
  transactionsService: {
    list: vi.fn(),
    summary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/accounts', () => ({
  accountsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/categories', () => ({
  categoriesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { accountsService } from '../services/accounts';
import { categoriesService } from '../services/categories';
import { transactionsService } from '../services/transactions';
import { mountOptions } from '../test-utils/vuetify';
import type { AccountView } from '../types/account';
import type { PaginatedTransactions, TransactionView } from '../types/transaction';
import TransactionsView from './TransactionsView.vue';

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

const page: PaginatedTransactions = {
  items: [transfer],
  total: 1,
  page: 1,
  limit: 20,
};

type ViewVm = {
  typeOptions: { value: string; label: string }[];
  filters: { type: string | undefined };
  applyFilters: () => void;
};

describe('TransactionsView transfers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    vi.mocked(accountsService.list).mockResolvedValue([
      account('a1', 'Checking'),
      account('a2', 'Savings'),
    ]);
    vi.mocked(categoriesService.list).mockResolvedValue([]);
  });

  it('renders transfer origin, destination and the Transfer filter option', async () => {
    const wrapper = mount(TransactionsView, {
      ...mountOptions,
      attachTo: document.body,
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Checking → Savings');
    expect(wrapper.text()).toContain('Transfer');
    expect((wrapper.vm as unknown as ViewVm).typeOptions).toContainEqual({
      value: 'transfer',
      label: 'Transfer',
    });
  });

  it('passes the transfer type to the transactions store filter', async () => {
    const wrapper = mount(TransactionsView, {
      ...mountOptions,
      attachTo: document.body,
    });

    await flushPromises();
    const view = wrapper.vm as unknown as ViewVm;
    vi.mocked(transactionsService.list).mockClear();

    view.filters.type = 'transfer';
    view.applyFilters();
    await flushPromises();

    expect(transactionsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transfer', page: 1 }),
    );
  });
});
