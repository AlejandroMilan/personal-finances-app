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
import type { ScheduledTransactionView } from '../../types/scheduled-transaction';
import ScheduledTransactionFormDialog from './ScheduledTransactionFormDialog.vue';

const scheduled: ScheduledTransactionView = {
  id: 's1',
  accountId: 'a1',
  categoryId: 'c1',
  type: 'income',
  title: 'Nómina',
  amount: 25000,
  tags: ['trabajo'],
  scheduledFor: new Date(2026, 8, 30, 0, 0, 0).toISOString(),
  recurring: true,
  status: 'pending',
  transactionId: null,
};

const mountDialog = (item: ScheduledTransactionView | null = null) =>
  mount(ScheduledTransactionFormDialog, {
    ...mountOptions,
    attachTo: document.body,
    props: { modelValue: false, scheduled: item },
  });

const open = async (wrapper: ReturnType<typeof mountDialog>) => {
  await wrapper.setProps({ modelValue: true });
  await wrapper.vm.$nextTick();
};

describe('ScheduledTransactionFormDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('offers every field of a scheduled transaction', async () => {
    const wrapper = mountDialog();

    await open(wrapper);

    const text = document.body.textContent ?? '';
    expect(text).toContain('Nueva transacción agendada');
    expect(text).toContain('Título');
    expect(text).toContain('Monto');
    expect(text).toContain('Cuenta');
    expect(text).toContain('Categoría');
    expect(text).toContain('Fecha prevista');
    expect(text).toContain('Etiquetas');
    expect(text).toContain('Recurrente');
  });

  it('preloads the values when editing', async () => {
    const wrapper = mountDialog(scheduled);

    await open(wrapper);

    expect(document.body.textContent).toContain('Editar agendada');
    const inputs = document.body.querySelectorAll('input');
    const values = Array.from(inputs).map((input) => input.value);
    expect(values).toContain('Nómina');
    expect(values).toContain('25000');
    expect(values).toContain('2026-09-30');
  });

  it('defaults a new scheduled transaction to the first account and today', async () => {
    const accounts = useAccountsStore();
    accounts.accounts = [
      {
        id: 'a9',
        name: 'Efectivo',
        balance: 0,
        color: '#2E6B4F',
        type: 'cash',
        creditCard: null,
      },
    ];
    const wrapper = mountDialog();

    await open(wrapper);

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const values = Array.from(document.body.querySelectorAll('input')).map(
      (input) => input.value,
    );
    expect(values).toContain(expected);
  });

  it.each([
    ['a blank title', { title: '   ' }],
    ['a non positive amount', { amount: 0 }],
    ['no account', { accountId: '' }],
  ])('does not emit save with %s', async (_label, invalid) => {
    const wrapper = mountDialog({ ...scheduled, ...invalid });

    await open(wrapper);
    await (wrapper.vm as unknown as { save: () => Promise<void> }).save();

    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('emits save with the payload of the form', async () => {
    const wrapper = mountDialog(scheduled);

    await open(wrapper);
    await (wrapper.vm as unknown as { save: () => Promise<void> }).save();

    const [[payload]] = wrapper.emitted('save') as [
      [Record<string, unknown>],
    ];
    expect(payload).toMatchObject({
      title: 'Nómina',
      amount: 25000,
      type: 'income',
      accountId: 'a1',
      categoryId: 'c1',
      recurring: true,
      tags: ['trabajo'],
    });
    expect(String(payload.scheduledFor)).toContain('2026-09-30');
  });

  it('closes without emitting save', async () => {
    const wrapper = mountDialog(scheduled);

    await open(wrapper);
    (wrapper.vm as unknown as { close: () => void }).close();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('save')).toBeUndefined();
  });
});
