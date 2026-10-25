import { afterEach, describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { Debt } from '../../types/debt';
import DebtFormDialog from './DebtFormDialog.vue';

const debt: Debt = {
  id: 'd1',
  name: 'Card',
  totalAmount: 900,
  revolving: true,
  annualInterestRate: 30,
  paymentMode: 'total',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mountDialog = (props: { modelValue: boolean; debt: Debt | null }) =>
  mount(DebtFormDialog, {
    ...mountOptions,
    attachTo: document.body,
    props,
  });

/** El formulario se carga al abrirse, como en la vista: se monta cerrado y se abre. */
const openDialog = async (debtToEdit: Debt | null) => {
  const wrapper = mountDialog({ modelValue: false, debt: debtToEdit });
  await wrapper.setProps({ modelValue: true, debt: debtToEdit });
  await flushPromises();
  return wrapper;
};

const saveButton = () =>
  document.body.querySelector<HTMLButtonElement>('[data-test="save-debt"]');

describe('DebtFormDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('prefills the form when editing a debt', async () => {
    const wrapper = await openDialog(debt);

    const values = Array.from(document.body.querySelectorAll('input')).map((input) => input.value);
    expect(values).toContain('Card');
    expect(values).toContain('900');
    expect(values).toContain('30');
    wrapper.unmount();
  });

  it('emits a create payload with the rate as null when left empty', async () => {
    const wrapper = await openDialog(null);

    const nameInput = document.body.querySelector<HTMLInputElement>('[data-test="debt-name-input"] input');
    const totalInput = document.body.querySelector<HTMLInputElement>('[data-test="debt-total-input"] input');
    nameInput!.value = '  Préstamo ';
    nameInput!.dispatchEvent(new Event('input'));
    totalInput!.value = '5000';
    totalInput!.dispatchEvent(new Event('input'));
    await flushPromises();

    saveButton()!.click();
    await flushPromises();

    expect(wrapper.emitted('save')?.[0][0]).toEqual({
      name: 'Préstamo',
      totalAmount: 5000,
      revolving: false,
      annualInterestRate: null,
      paymentMode: 'capital',
    });
    wrapper.unmount();
  });

  it('does not save an empty name', async () => {
    const wrapper = await openDialog(null);

    saveButton()!.click();
    await flushPromises();

    expect(wrapper.emitted('save')).toBeUndefined();
    wrapper.unmount();
  });
});
