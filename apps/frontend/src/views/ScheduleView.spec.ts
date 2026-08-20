import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

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

vi.mock('../services/accounts', () => ({
  accountsService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

vi.mock('../services/categories', () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

import { accountsService } from '../services/accounts';
import { categoriesService } from '../services/categories';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import { mountOptions } from '../test-utils/vuetify';
import type { ScheduledTransactionView } from '../types/scheduled-transaction';
import router from '../router';
import ScheduleView from './ScheduleView.vue';

const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const scheduled = (
  overrides: Partial<ScheduledTransactionView> = {},
): ScheduledTransactionView => ({
  id: 's1',
  accountId: 'a1',
  categoryId: 'c1',
  type: 'expense',
  title: 'Renta',
  amount: 12000,
  tags: [],
  scheduledFor: daysFromNow(5),
  recurring: false,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mountView = async () => {
  const wrapper = mount(ScheduleView, mountOptions);
  await flush();
  await wrapper.vm.$nextTick();
  return wrapper;
};

const vm = (wrapper: Awaited<ReturnType<typeof mountView>>) =>
  wrapper.vm as unknown as {
    openExecute: (item: ScheduledTransactionView) => void;
    confirmExecute: (payload: Record<string, unknown>) => Promise<void>;
    cancel: (item: ScheduledTransactionView) => Promise<void>;
    remove: (item: ScheduledTransactionView) => Promise<void>;
    save: (payload: Record<string, unknown>) => Promise<void>;
    openEdit: (item: ScheduledTransactionView) => void;
    openCreate: () => void;
    selectStatus: (status: 'pending' | 'executed' | 'cancelled') => void;
  };

describe('ScheduleView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(accountsService.list).mockResolvedValue([
      { id: 'a1', name: 'BBVA', balance: 0, color: '#2E6B4F', type: 'debit', creditCard: null },
    ]);
    vi.mocked(categoriesService.list).mockResolvedValue([
      { id: 'c1', name: 'Vivienda', color: '#2E6B4F' },
    ]);
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([scheduled()]);
  });

  it('is routed at /schedule behind the auth guard', () => {
    const route = router.getRoutes().find((entry) => entry.path === '/schedule');

    expect(route).toBeDefined();
    expect(route?.meta.requiresAuth).toBe(true);
  });

  it('redirects to the login screen when there is no session', async () => {
    localStorage.removeItem('auth-token');
    await router.push('/schedule');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('login');
  });

  it('lists the scheduled transactions with the account and category names', async () => {
    const wrapper = await mountView();

    expect(scheduledTransactionsService.list).toHaveBeenCalledWith({
      status: 'pending',
    });
    expect(wrapper.text()).toContain('Renta');
    expect(wrapper.text()).toContain('BBVA');
    expect(wrapper.text()).toContain('Vivienda');
  });

  it('groups the overdue ones first, separated from the upcoming ones', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'late', title: 'Vencida', scheduledFor: daysFromNow(-5) }),
      scheduled({ id: 'soon', title: 'Próxima', scheduledFor: daysFromNow(5) }),
    ]);
    const wrapper = await mountView();

    const overdueSection = wrapper.find('[data-test="overdue-section"]');
    const upcomingSection = wrapper.find('[data-test="upcoming-section"]');

    expect(overdueSection.exists()).toBe(true);
    expect(overdueSection.text()).toContain('Vencidas (1)');
    expect(overdueSection.text()).toContain('Vencida');
    expect(overdueSection.text()).not.toContain('Próxima');
    expect(upcomingSection.text()).toContain('Próxima');
    expect(wrapper.html().indexOf('data-test="overdue-section"')).toBeLessThan(
      wrapper.html().indexOf('data-test="upcoming-section"'),
    );
  });

  it('sorts the listing by scheduled date ascending', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'b', title: 'Segunda', scheduledFor: daysFromNow(20) }),
      scheduled({ id: 'a', title: 'Primera', scheduledFor: daysFromNow(2) }),
    ]);
    const wrapper = await mountView();

    const text = wrapper.text();
    expect(text.indexOf('Primera')).toBeLessThan(text.indexOf('Segunda'));
  });

  it('starts on the pending filter and can switch to the other states', async () => {
    const wrapper = await mountView();

    expect(wrapper.find('[data-test="status-filter"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Pendientes');
    expect(wrapper.text()).toContain('Ejecutadas');
    expect(wrapper.text()).toContain('Canceladas');

    vm(wrapper).selectStatus('executed');
    await flush();

    expect(scheduledTransactionsService.list).toHaveBeenLastCalledWith({
      status: 'executed',
    });
  });

  it('shows an explicit empty state when there is nothing pending', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([]);
    const wrapper = await mountView();

    expect(wrapper.find('[data-test="schedule-empty"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No tienes nada agendado');
    expect(wrapper.find('[data-test="overdue-section"]').exists()).toBe(false);
  });

  it('creates a scheduled transaction and refreshes the list', async () => {
    const wrapper = await mountView();

    vm(wrapper).openCreate();
    await vm(wrapper).save({
      title: 'Luz',
      amount: 800,
      type: 'expense',
      accountId: 'a1',
      scheduledFor: daysFromNow(3),
    });

    expect(scheduledTransactionsService.create).toHaveBeenCalled();
    expect(scheduledTransactionsService.list).toHaveBeenCalledTimes(2);
  });

  it('edits a scheduled transaction and refreshes the list', async () => {
    const wrapper = await mountView();

    vm(wrapper).openEdit(scheduled());
    await vm(wrapper).save({ amount: 13000 });

    expect(scheduledTransactionsService.update).toHaveBeenCalledWith('s1', {
      amount: 13000,
    });
    expect(scheduledTransactionsService.list).toHaveBeenCalledTimes(2);
  });

  it('executes a scheduled transaction and refreshes the list', async () => {
    const wrapper = await mountView();

    vm(wrapper).openExecute(scheduled());
    await vm(wrapper).confirmExecute({ amount: 12000 });

    expect(scheduledTransactionsService.execute).toHaveBeenCalledWith('s1', {
      amount: 12000,
    });
    expect(scheduledTransactionsService.list).toHaveBeenCalledTimes(2);
  });

  it('cancels a scheduled transaction and refreshes the list', async () => {
    const wrapper = await mountView();

    await vm(wrapper).cancel(scheduled());

    expect(scheduledTransactionsService.cancel).toHaveBeenCalledWith('s1');
    expect(scheduledTransactionsService.list).toHaveBeenCalledTimes(2);
  });

  it('deletes a scheduled transaction and refreshes the list', async () => {
    const wrapper = await mountView();

    await vm(wrapper).remove(scheduled());

    expect(scheduledTransactionsService.remove).toHaveBeenCalledWith('s1');
    expect(scheduledTransactionsService.list).toHaveBeenCalledTimes(2);
  });

  it('surfaces the error of a failed action', async () => {
    vi.mocked(scheduledTransactionsService.cancel).mockRejectedValue(
      new Error('no se pudo'),
    );
    const wrapper = await mountView();

    await vm(wrapper).cancel(scheduled());
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="action-error"]').text()).toContain(
      'no se pudo',
    );
  });
});
