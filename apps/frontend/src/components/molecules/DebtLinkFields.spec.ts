import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { Debt } from '../../types/debt';
import { emptyDebtLinkForm, type DebtLinkForm } from '../../utils/debt-link';
import DebtLinkFields from './DebtLinkFields.vue';

const debts: Debt[] = [
  {
    id: 'd1',
    name: 'Card',
    totalAmount: 900,
    revolving: true,
    annualInterestRate: null,
    paymentMode: 'capital',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mountFields = (type: string, form: DebtLinkForm = emptyDebtLinkForm(), amount = 120) =>
  mount(DebtLinkFields, {
    ...mountOptions,
    props: { modelValue: form, type, amount, debts },
  });

describe('DebtLinkFields', () => {
  it('renders nothing for transfers', () => {
    const wrapper = mountFields('transfer');
    expect(wrapper.find('[data-test="debt-link-fields"]').exists()).toBe(false);
  });

  it('offers the payment switch for expenses and emits the enabled form', async () => {
    const wrapper = mountFields('expense');
    expect(wrapper.get('[data-test="debt-link-switch"]').text()).toContain('Es pago de deuda');
    expect(wrapper.find('[data-test="debt-link-capital"]').exists()).toBe(false);

    wrapper.findComponent({ name: 'VSwitch' }).vm.$emit('update:modelValue', true);

    const emitted = wrapper.emitted('update:modelValue')?.[0][0] as DebtLinkForm;
    expect(emitted).toMatchObject({ enabled: true, kind: 'payment' });
  });

  it('clears the link fields when the switch is turned off', () => {
    const wrapper = mountFields('expense', {
      enabled: true,
      kind: 'payment',
      debtId: 'd1',
      capital: 100,
      extraInterest: 0,
    });

    wrapper.findComponent({ name: 'VSwitch' }).vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toEqual({
      ...emptyDebtLinkForm(),
      kind: 'payment',
    });
  });

  it('shows the capital editable and the interest read-only for payments', () => {
    const wrapper = mountFields('expense', {
      enabled: true,
      kind: 'payment',
      debtId: 'd1',
      capital: 100,
      extraInterest: 0,
    });

    expect(wrapper.find('[data-test="debt-link-debt"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="debt-link-capital"]').exists()).toBe(true);
    const interest = wrapper.get('[data-test="debt-link-interest"] input');
    expect(interest.attributes('readonly')).toBeDefined();
    expect((interest.element as HTMLInputElement).value).toBe('$20.00');
  });

  it('offers the increase fields for income', () => {
    const wrapper = mountFields('income', {
      enabled: true,
      kind: 'increase',
      debtId: 'd1',
      capital: 0,
      extraInterest: 0,
    });

    expect(wrapper.get('[data-test="debt-link-switch"]').text()).toContain('Es ingreso de deuda');
    expect(wrapper.find('[data-test="debt-link-extra-interest"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="debt-link-capital"]').exists()).toBe(false);
  });

  it('hides an active payment when the type is no longer an expense', () => {
    const wrapper = mountFields('income', {
      enabled: true,
      kind: 'payment',
      debtId: 'd1',
      capital: 100,
      extraInterest: 0,
    });

    expect(wrapper.find('[data-test="debt-link-debt"]').exists()).toBe(false);
    const switchInput = wrapper.findComponent({ name: 'VSwitch' });
    expect(switchInput.props('modelValue')).toBe(false);
  });
});
