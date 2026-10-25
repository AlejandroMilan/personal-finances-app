import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { Debt } from '../../types/debt';
import DebtCard from './DebtCard.vue';

const debt: Debt = {
  id: 'd1',
  name: 'Tarjeta Azul',
  totalAmount: 1500.5,
  revolving: true,
  annualInterestRate: 42,
  paymentMode: 'total',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DebtCard', () => {
  it('shows the name, total owed, revolving flag, rate and payment mode', () => {
    const wrapper = mount(DebtCard, { ...mountOptions, props: { debt } });

    expect(wrapper.get('[data-test="debt-name"]').text()).toBe('Tarjeta Azul');
    expect(wrapper.get('[data-test="debt-total"]').text()).toContain('1,500.50');
    expect(wrapper.text()).toContain('Revolvente');
    expect(wrapper.get('[data-test="debt-rate"]').text()).toBe('42% anual');
    expect(wrapper.text()).toContain('Descuenta monto total');
  });

  it('says when the debt has no interest rate and is not revolving', () => {
    const wrapper = mount(DebtCard, {
      ...mountOptions,
      props: { debt: { ...debt, revolving: false, annualInterestRate: null, paymentMode: 'capital' } },
    });

    expect(wrapper.text()).toContain('Simple');
    expect(wrapper.get('[data-test="debt-rate"]').text()).toBe('Sin tasa');
    expect(wrapper.text()).toContain('Descuenta sólo capital');
  });

  it('emits edit and remove with the debt', async () => {
    const wrapper = mount(DebtCard, { ...mountOptions, props: { debt } });

    await wrapper.get('[data-test="edit-debt"]').trigger('click');
    await wrapper.get('[data-test="delete-debt"]').trigger('click');

    expect(wrapper.emitted('edit')?.[0]).toEqual([debt]);
    expect(wrapper.emitted('remove')?.[0]).toEqual([debt]);
  });
});
