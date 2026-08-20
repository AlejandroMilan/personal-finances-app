import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../../services/scheduled-transactions', () => ({
  scheduledTransactionsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('../../services/accounts', () => ({
  accountsService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

vi.mock('../../services/categories', () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

import { scheduledTransactionsService } from '../../services/scheduled-transactions';
import router from '../../router';
import { vuetify } from '../../test-utils/vuetify';
import type { ScheduledTransactionView } from '../../types/scheduled-transaction';
import UpcomingScheduleCard from './UpcomingScheduleCard.vue';

const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

/** Un día del mes en curso que ya pasó, o el día 1 si hoy es el primero. */
const earlierThisMonth = (): string => {
  const today = new Date();
  const day = today.getDate() > 1 ? 1 : 1;
  return new Date(today.getFullYear(), today.getMonth(), day).toISOString();
};

const nextMonth = (): string => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 2, 1).toISOString();
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
  scheduledFor: daysFromNow(0),
  recurring: false,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mountCard = async () => {
  const wrapper = mount(UpcomingScheduleCard, {
    global: { plugins: [vuetify, router] },
  });
  await flush();
  await wrapper.vm.$nextTick();
  return wrapper;
};

const vm = (wrapper: Awaited<ReturnType<typeof mountCard>>) =>
  wrapper.vm as unknown as {
    openExecute: (item: ScheduledTransactionView) => void;
    confirmExecute: (payload: Record<string, unknown>) => Promise<void>;
    cancel: (item: ScheduledTransactionView) => Promise<void>;
  };

describe('UpcomingScheduleCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([]);
  });

  it('shows the overdue ones and the ones of the current month, grouped', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'late', title: 'Vencida', scheduledFor: daysFromNow(-40) }),
      scheduled({ id: 'now', title: 'Este mes', scheduledFor: earlierThisMonth() }),
    ]);
    const wrapper = await mountCard();

    const overdueSection = wrapper.find('[data-test="dashboard-overdue"]');
    expect(overdueSection.exists()).toBe(true);
    expect(overdueSection.text()).toContain('Vencidas');
    expect(overdueSection.text()).toContain('Vencida');
    expect(wrapper.text()).toContain('Este mes');
  });

  it('leaves out what falls beyond the current month', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'far', title: 'El mes que viene', scheduledFor: nextMonth() }),
    ]);
    const wrapper = await mountCard();

    expect(wrapper.text()).not.toContain('El mes que viene');
    expect(wrapper.find('[data-test="upcoming-schedule-empty"]').exists()).toBe(
      true,
    );
  });

  it('leaves out what is not pending', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'done', title: 'Ya ejecutada', status: 'executed' }),
    ]);
    const wrapper = await mountCard();

    expect(wrapper.text()).not.toContain('Ya ejecutada');
  });

  it('confirms from the dashboard and refreshes without reloading', async () => {
    vi.mocked(scheduledTransactionsService.list)
      .mockResolvedValueOnce([scheduled()])
      .mockResolvedValue([]);
    const wrapper = await mountCard();

    expect(wrapper.text()).toContain('Renta');

    vm(wrapper).openExecute(scheduled());
    await vm(wrapper).confirmExecute({ amount: 12000 });
    await flush();
    await wrapper.vm.$nextTick();

    expect(scheduledTransactionsService.execute).toHaveBeenCalledWith('s1', {
      amount: 12000,
    });
    expect(wrapper.text()).not.toContain('Renta');
  });

  it('cancels from the dashboard and refreshes without reloading', async () => {
    vi.mocked(scheduledTransactionsService.list)
      .mockResolvedValueOnce([scheduled()])
      .mockResolvedValue([]);
    const wrapper = await mountCard();

    await vm(wrapper).cancel(scheduled());
    await flush();
    await wrapper.vm.$nextTick();

    expect(scheduledTransactionsService.cancel).toHaveBeenCalledWith('s1');
    expect(wrapper.text()).not.toContain('Renta');
  });

  it('links to the schedule screen', async () => {
    const wrapper = await mountCard();

    expect(wrapper.find('[data-test="schedule-link"]').attributes('href')).toBe(
      '/schedule',
    );
  });

  it('shows an explicit empty state when there is nothing pending', async () => {
    const wrapper = await mountCard();

    expect(wrapper.find('[data-test="upcoming-schedule-empty"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('No tienes nada pendiente este mes');
  });

  it('surfaces the error of a failed action', async () => {
    vi.mocked(scheduledTransactionsService.cancel).mockRejectedValue(
      new Error('no se pudo'),
    );
    const wrapper = await mountCard();

    await vm(wrapper).cancel(scheduled());
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="schedule-action-error"]').text()).toContain(
      'no se pudo',
    );
  });
});
