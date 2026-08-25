import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-chartjs', () => ({
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<div data-test="donut-chart" />',
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

vi.mock('../services/budgets', () => ({
  budgetsService: {
    list: vi.fn(),
    getByMonth: vi.fn(),
    template: vi.fn(),
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

vi.mock('../services/scheduled-transactions', () => ({
  scheduledTransactionsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('../services/transactions', () => ({
  transactionsService: {
    list: vi.fn(),
    summary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import AccountCard from '../components/molecules/AccountCard.vue';
import LiquidityCard from '../components/molecules/LiquidityCard.vue';
import AccountFormDialog from '../components/organisms/AccountFormDialog.vue';
import { accountsService } from '../services/accounts';
import { budgetsService } from '../services/budgets';
import { categoriesService } from '../services/categories';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import { transactionsService } from '../services/transactions';
import { mountOptions } from '../test-utils/vuetify';
import type { AccountView, CreateAccountPayload } from '../types/account';
import AccountsView from './AccountsView.vue';
import HomeView from './HomeView.vue';

const accounts: AccountView[] = [
  {
    id: 'cash-id',
    name: 'Cash',
    balance: 1200.5,
    color: '#2E6B4F',
    type: 'cash',
    creditCard: null,
  },
  {
    id: 'debit-id',
    name: 'Debit account',
    balance: 350,
    color: '#7FA56E',
    type: 'debit',
    creditCard: null,
  },
  {
    id: 'credit-id',
    name: 'Credit card',
    balance: 0,
    color: '#2F6D80',
    type: 'credit',
    creditCard: {
      id: 'card-id',
      creditLimit: 1000,
      usedAmount: 275,
      cutoffDate: '2026-08-20',
      paymentDate: '2026-08-28',
    },
  },
];

const copyAccounts = (): AccountView[] =>
  accounts.map((account) => ({
    ...account,
    creditCard: account.creditCard ? { ...account.creditCard } : null,
  }));

const mountAccountsView = async (): Promise<VueWrapper> => {
  const wrapper = mount(AccountsView, mountOptions);
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
};

const mountHomeView = async (): Promise<VueWrapper> => {
  const wrapper = mount(HomeView, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      stubs: {
        DashboardSummary: { template: '<div data-test="dashboard-summary-stub" />' },
        UpcomingScheduleCard: { template: '<div data-test="upcoming-schedule-stub" />' },
      },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
};

const readLiquidity = (wrapper: VueWrapper) => {
  const card = wrapper.findComponent(LiquidityCard);
  const data = card.findComponent({ name: 'Doughnut' }).props('data') as {
    labels: string[];
    datasets: Array<{ data: number[]; backgroundColor: string[] }>;
  };

  return {
    total: card.find('[data-test="donut-total"] .text-h6').text(),
    labels: data.labels,
    values: data.datasets[0].data,
  };
};

type AccountsViewVm = {
  openCreate: () => void;
  openEdit: (account: AccountView) => void;
  confirmDelete: () => Promise<void>;
};

const viewVm = (wrapper: VueWrapper): AccountsViewVm =>
  wrapper.vm as unknown as AccountsViewVm;

describe('AccountsView liquidity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(accountsService.list).mockImplementation(async () => copyAccounts());
    vi.mocked(accountsService.create).mockReset();
    vi.mocked(accountsService.update).mockReset();
    vi.mocked(accountsService.remove).mockReset();
    vi.mocked(budgetsService.list).mockResolvedValue([]);
    vi.mocked(categoriesService.list).mockResolvedValue([]);
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([]);
    vi.mocked(transactionsService.summary).mockResolvedValue({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.000Z',
      granularity: 'day',
      timeZone: 'UTC',
      totals: { income: 0, expense: 0 },
      byCategory: { income: [], expense: [] },
      series: [],
    });
  });

  it('renders LiquidityCard above the account listing', async () => {
    const wrapper = await mountAccountsView();

    expect(wrapper.findComponent(LiquidityCard).exists()).toBe(true);
    expect(wrapper.findAllComponents(AccountCard)).toHaveLength(3);
    expect(wrapper.html().indexOf('Liquidez actual')).toBeLessThan(
      wrapper.html().indexOf('Cash'),
    );
  });

  it('loads accounts from HomeView when UpcomingScheduleCard is stubbed', async () => {
    const wrapper = await mountHomeView();

    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(LiquidityCard).props('accounts')).toEqual(
      accounts,
    );
  });

  it('passes the same accounts, total and slices in the dashboard and accounts views', async () => {
    const home = await mountHomeView();
    const accountsView = await mountAccountsView();

    const homeCard = home.findComponent(LiquidityCard);
    const accountsCard = accountsView.findComponent(LiquidityCard);

    expect(homeCard.props('accounts')).toEqual(accountsCard.props('accounts'));
    expect(readLiquidity(home)).toEqual(readLiquidity(accountsView));
    expect(readLiquidity(home)).toEqual({
      total: '$2,275.50',
      labels: ['Cash', 'Debit account', 'Credit card'],
      values: [1200.5, 350, 725],
    });
  });

  it('recalculates the total and slices immediately after creating an account', async () => {
    const created: AccountView = {
      id: 'new-id',
      name: 'Travel wallet',
      balance: 100,
      color: '#C98A2D',
      type: 'cash',
      creditCard: null,
    };
    const payload: CreateAccountPayload = {
      name: created.name,
      balance: created.balance,
      color: created.color,
      type: created.type,
    };
    vi.mocked(accountsService.create).mockResolvedValue(created);

    const wrapper = await mountAccountsView();
    const form = wrapper.findComponent(AccountFormDialog);
    viewVm(wrapper).openCreate();
    form.vm.$emit('save', payload);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(accountsService.create).toHaveBeenCalledWith(payload);
    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(readLiquidity(wrapper)).toEqual({
      total: '$2,375.50',
      labels: ['Travel wallet', 'Cash', 'Debit account', 'Credit card'],
      values: [100, 1200.5, 350, 725],
    });
  });

  it('recalculates the total and slices immediately after updating an account', async () => {
    const updated = { ...accounts[0], balance: 2000 };
    vi.mocked(accountsService.update).mockResolvedValue(updated);

    const wrapper = await mountAccountsView();
    const form = wrapper.findComponent(AccountFormDialog);
    viewVm(wrapper).openEdit(accounts[0]);
    form.vm.$emit('save', { balance: 2000 });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(accountsService.update).toHaveBeenCalledWith('cash-id', { balance: 2000 });
    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(readLiquidity(wrapper)).toEqual({
      total: '$3,075.00',
      labels: ['Cash', 'Debit account', 'Credit card'],
      values: [2000, 350, 725],
    });
  });

  it('recalculates the total and slices immediately after deleting an account', async () => {
    vi.mocked(accountsService.remove).mockResolvedValue(undefined);

    const wrapper = await mountAccountsView();
    const debitCard = wrapper.findAllComponents(AccountCard)[1];
    debitCard.vm.$emit('delete');
    await wrapper.vm.$nextTick();
    await viewVm(wrapper).confirmDelete();
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(accountsService.remove).toHaveBeenCalledWith('debit-id');
    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(readLiquidity(wrapper)).toEqual({
      total: '$1,925.50',
      labels: ['Cash', 'Credit card'],
      values: [1200.5, 725],
    });
  });
});
