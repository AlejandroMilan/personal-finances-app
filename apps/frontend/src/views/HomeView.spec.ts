import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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

vi.mock('../services/accounts', () => ({
  accountsService: { list: vi.fn() },
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

import { accountsService } from '../services/accounts';
import { budgetsService } from '../services/budgets';
import { categoriesService } from '../services/categories';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import { transactionsService } from '../services/transactions';
import LiquidityCard from '../components/molecules/LiquidityCard.vue';
import router from '../router';
import { vuetify } from '../test-utils/vuetify';
import type { AccountView } from '../types/account';
import { useAccountsStore } from '../stores/accounts';
import HomeView from './HomeView.vue';

const mountOptions = { global: { plugins: [vuetify, router] } };

const account: AccountView = {
  id: 'a1',
  name: 'Checking',
  balance: 750,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
};

const homeWithUpcomingStubMountOptions = {
  ...mountOptions,
  global: {
    ...mountOptions.global,
    stubs: {
      DashboardSummary: true,
      UpcomingScheduleCard: true,
    },
  },
};

const homeWithRealUpcomingMountOptions = {
  ...mountOptions,
  global: {
    ...mountOptions.global,
    stubs: {
      DashboardSummary: true,
    },
  },
};

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(categoriesService.list).mockResolvedValue([]);
    vi.mocked(accountsService.list).mockResolvedValue([]);
    vi.mocked(budgetsService.list).mockResolvedValue([]);
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([]);
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

  it('loads accounts from HomeView when UpcomingScheduleCard is stubbed', async () => {
    vi.mocked(accountsService.list).mockResolvedValue([account]);
    const accountsStore = useAccountsStore();
    const fetchAccounts = vi.spyOn(accountsStore, 'fetchAccounts');

    const wrapper = mount(HomeView, homeWithUpcomingStubMountOptions);
    await flushPromises();

    const liquidityCard = wrapper.findComponent(LiquidityCard);

    expect(liquidityCard.exists()).toBe(true);
    expect(fetchAccounts).toHaveBeenCalledTimes(1);
    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(liquidityCard.props('accounts')).toEqual([account]);
  });

  it('loads accounts once when the real UpcomingScheduleCard is mounted', async () => {
    vi.mocked(accountsService.list).mockResolvedValue([account]);

    const wrapper = mount(HomeView, homeWithRealUpcomingMountOptions);
    await flushPromises();

    const liquidityCard = wrapper.findComponent(LiquidityCard);

    expect(wrapper.find('[data-test="upcoming-schedule-card"]').exists()).toBe(
      true,
    );
    expect(accountsService.list).toHaveBeenCalledTimes(1);
    expect(liquidityCard.props('accounts')).toEqual([account]);
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

  it('renders the schedule card above the summary', async () => {
    const wrapper = mount(HomeView, mountOptions);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.find('[data-test="upcoming-schedule-card"]').exists()).toBe(
      true,
    );
    expect(scheduledTransactionsService.list).toHaveBeenCalledWith({
      status: 'pending',
    });
    expect(wrapper.text()).toContain('Agenda');
  });

  it('keeps the summary charts fed only by the transactions summary', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      {
        id: 's1',
        accountId: 'a1',
        destinationAccountId: null,
        categoryId: 'c1',
        type: 'expense',
        title: 'Renta',
        amount: 12000,
        tags: [],
        scheduledFor: new Date().toISOString(),
        recurring: false,
        status: 'pending',
        transactionId: null,
      },
    ]);
    mount(HomeView, mountOptions);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // El resumen se pide una sola vez y con los mismos parametros de siempre:
    // lo agendado no entra en totales ni series.
    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    const [query] = vi.mocked(transactionsService.summary).mock.calls[0];
    expect(Object.keys(query).sort()).toEqual([
      'from',
      'granularity',
      'timeZone',
      'to',
    ]);
  });

  it('does not reload or change liquidity when the dashboard period changes', async () => {
    vi.mocked(accountsService.list).mockResolvedValue([account]);

    const wrapper = mount(HomeView, {
      ...mountOptions,
      global: {
        ...mountOptions.global,
        stubs: { UpcomingScheduleCard: true },
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const liquidityCard = wrapper.findComponent(LiquidityCard);
    const beforeAccounts = liquidityCard.props('accounts');
    const beforeTotal = liquidityCard.find('[data-test="donut-total"]').text();
    const beforeChartData = liquidityCard
      .findComponent({ name: 'Doughnut' })
      .props('data');
    vi.mocked(accountsService.list).mockClear();

    await wrapper.find('[data-test="preset-year"]').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(accountsService.list).not.toHaveBeenCalled();
    expect(liquidityCard.props('accounts')).toEqual(beforeAccounts);
    expect(liquidityCard.find('[data-test="donut-total"]').text()).toBe(
      beforeTotal,
    );
    expect(
      liquidityCard.findComponent({ name: 'Doughnut' }).props('data'),
    ).toEqual(beforeChartData);
  });
});
