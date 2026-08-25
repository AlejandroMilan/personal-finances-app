import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { AccountView } from '../../types/account';
import type { CategoryView } from '../../types/category';
import type { BudgetItem, CreateBudgetPayload } from '../../types/budget';
import AccountFormDialog from './AccountFormDialog.vue';
import BudgetFormDialog from './BudgetFormDialog.vue';

const categories: CategoryView[] = [
  { id: 'c1', name: 'Vivienda', color: '#2E6B4F' },
  { id: 'c2', name: 'Comida', color: '#7FA56E' },
];

const rentItem: BudgetItem = {
  categoryId: 'c1',
  type: 'expense',
  amount: 1200,
  note: 'Renta (agenda)',
};

const foodItem: BudgetItem = {
  categoryId: 'c2',
  type: 'expense',
  amount: 500,
};

const dialogStub = {
  name: 'VDialog',
  props: ['modelValue', 'maxWidth'],
  template: '<div data-test="dialog-shell"><slot /></div>',
};

const mountDialog = (
  items: BudgetItem[] = [rentItem],
  categoryList: CategoryView[] = categories,
) =>
  mount(BudgetFormDialog, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      stubs: { VDialog: dialogStub },
    },
    props: {
      modelValue: true,
      month: '2026-09',
      items,
      categories: categoryList,
    },
  });

const mountAccountDialog = (account: AccountView | null = null) =>
  mount(AccountFormDialog, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      stubs: { VDialog: dialogStub },
    },
    props: {
      modelValue: true,
      account,
    },
  });

type DialogVm = {
  items: Array<{
    categoryId: string;
    type: 'income' | 'expense';
    amount: number;
    note: string;
  }>;
  save: () => Promise<void>;
  close: () => void;
};

const vm = (wrapper: ReturnType<typeof mountDialog>) =>
  wrapper.vm as unknown as DialogVm;

describe('BudgetFormDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens with the selected month and agenda-derived notes prefilled', () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain('Edit budget');
    expect(wrapper.text()).toContain('Item 1');
    expect(wrapper.text()).toContain('Category');
    expect(wrapper.text()).toContain('Type');
    expect(wrapper.text()).toContain('Expense');
    expect(wrapper.text()).toContain('Planned amount');
    expect(wrapper.text()).toContain('Note');
    expect(wrapper.text()).toContain('Add item');
    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.find('[data-test="remove-budget-item"]').attributes('aria-label')).toBe(
      'Remove item',
    );
    expect(wrapper.findAllComponents({ name: 'VSelect' })[1].props('items')).toEqual([
      { value: 'expense', label: 'Expense' },
      { value: 'income', label: 'Income' },
    ]);
    expect(wrapper.text()).toContain('2026-09');
    const noteInput = wrapper.find('[data-test="budget-item-note"] input')
      .element as HTMLInputElement;
    expect(noteInput.value).toBe('Renta (agenda)');
    const buttons = wrapper.findAllComponents({ name: 'VBtn' });
    expect(
      buttons.find((button) => button.props('icon') === 'mdi-delete-outline')?.props('color'),
    ).toBe('error');
    expect(
      buttons.find((button) => button.props('prependIcon') === 'mdi-plus')?.props('color'),
    ).toBe('secondary');
    expect(
      buttons.find((button) => button.text().includes('Save budget'))?.props('color'),
    ).toBe('primary');
  });

  it('matches the account dialog layout and default field treatment', () => {
    const wrapper = mountDialog([rentItem, foodItem]);
    const accountWrapper = mountAccountDialog();

    expect(wrapper.findComponent({ name: 'VDialog' }).props('maxWidth')).toBe(
      accountWrapper.findComponent({ name: 'VDialog' }).props('maxWidth'),
    );
    expect(wrapper.findComponent({ name: 'VCard' }).props('color')).toBe(
      accountWrapper.findComponent({ name: 'VCard' }).props('color'),
    );
    expect(wrapper.findComponent({ name: 'VCard' }).classes()).toEqual(
      accountWrapper.findComponent({ name: 'VCard' }).classes(),
    );
    expect(wrapper.findComponent({ name: 'VCard' }).classes()).toContain('pa-6');
    expect(wrapper.findComponent({ name: 'VCardTitle' }).classes()).toEqual(
      accountWrapper.findComponent({ name: 'VCardTitle' }).classes(),
    );
    expect(wrapper.findComponent({ name: 'VCardTitle' }).classes()).toContain('pb-4');
    expect(wrapper.findComponent({ name: 'VForm' }).exists()).toBe(true);

    const accountSelect = accountWrapper.findComponent({ name: 'VSelect' });
    const accountTextField = accountWrapper.findComponent({ name: 'VTextField' });
    const budgetSelects = wrapper.findAllComponents({ name: 'VSelect' });
    const budgetTextFields = wrapper
      .findAllComponents({ name: 'VTextField' })
      .filter((field) => !field.classes().includes('v-select'));

    expect(budgetSelects).toHaveLength(4);
    expect(budgetTextFields).toHaveLength(4);
    expect(budgetSelects.map((field) => field.props('variant'))).toEqual([
      accountSelect.props('variant'),
      accountSelect.props('variant'),
      accountSelect.props('variant'),
      accountSelect.props('variant'),
    ]);
    expect(budgetSelects.map((field) => field.props('color'))).toEqual([
      accountSelect.props('color'),
      accountSelect.props('color'),
      accountSelect.props('color'),
      accountSelect.props('color'),
    ]);
    expect(budgetSelects.map((field) => field.props('baseColor'))).toEqual([
      accountSelect.props('baseColor'),
      accountSelect.props('baseColor'),
      accountSelect.props('baseColor'),
      accountSelect.props('baseColor'),
    ]);
    expect(budgetTextFields.map((field) => field.props('variant'))).toEqual([
      accountTextField.props('variant'),
      accountTextField.props('variant'),
      accountTextField.props('variant'),
      accountTextField.props('variant'),
    ]);
    expect(budgetTextFields.map((field) => field.props('color'))).toEqual([
      accountTextField.props('color'),
      accountTextField.props('color'),
      accountTextField.props('color'),
      accountTextField.props('color'),
    ]);
    expect(budgetTextFields.map((field) => field.props('baseColor'))).toEqual([
      accountTextField.props('baseColor'),
      accountTextField.props('baseColor'),
      accountTextField.props('baseColor'),
      accountTextField.props('baseColor'),
    ]);

    const budgetFooter = wrapper.find('.d-flex.justify-end.mt-4');
    const accountFooter = accountWrapper.find('.d-flex.justify-end.mt-4');
    const budgetFooterButtons = budgetFooter.findAllComponents({ name: 'VBtn' });
    const accountFooterButtons = accountFooter.findAllComponents({ name: 'VBtn' });
    expect(budgetFooter.classes()).toEqual(accountFooter.classes());
    expect(budgetFooterButtons).toHaveLength(2);
    expect(accountFooterButtons).toHaveLength(2);
    expect(budgetFooterButtons[0].classes()).toEqual(accountFooterButtons[0].classes());
    expect(budgetFooterButtons[0].props('variant')).toBe(accountFooterButtons[0].props('variant'));
    expect(budgetFooterButtons[1].props('color')).toBe(accountFooterButtons[1].props('color'));

    const dividers = wrapper.findAllComponents({ name: 'VDivider' });
    expect(dividers).toHaveLength(2);
    expect(dividers.every((divider) => divider.classes().includes('my-4'))).toBe(true);
  });

  it('shows English empty-state and validation copy for a new budget', async () => {
    const wrapper = mountDialog([], []);

    expect(wrapper.text()).toContain('New budget');
    expect(wrapper.text()).toContain('No proposed items for this month.');

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.text()).toContain('Category is required');
    expect(wrapper.text()).toContain('Amount must be greater than zero');
  });

  it('keeps focus styling on every field and shows errors on invalid required fields', async () => {
    const wrapper = mountDialog([], []);

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');
    const [categoryField, typeField] = wrapper.findAllComponents({ name: 'VSelect' });
    const [amountField, noteField] = wrapper.findAllComponents({ name: 'VTextField' });

    for (const field of [categoryField, typeField, amountField, noteField]) {
      const input = field.find('input');
      expect(input.exists()).toBe(true);
      await input.trigger('focus');
      expect(field.find('.v-field--focused').exists()).toBe(true);
      await input.trigger('blur');
    }

    await vm(wrapper).save();

    expect(categoryField.find('.v-field--error').exists()).toBe(true);
    expect(amountField.find('.v-field--error').exists()).toBe(true);
    expect(typeField.find('.v-field--error').exists()).toBe(false);
    expect(noteField.find('.v-field--error').exists()).toBe(false);
  });

  it('adds and removes rows locally without changing the input props', async () => {
    const source = [rentItem];
    const wrapper = mountDialog(source);

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');

    expect(wrapper.findAll('[data-test="budget-item-row"]')).toHaveLength(2);
    expect(vm(wrapper).items[1]).toMatchObject({
      categoryId: 'c1',
      type: 'expense',
      amount: 0,
      note: '',
    });

    await wrapper.findAll('[data-test="remove-budget-item"]')[0].trigger('click');

    expect(wrapper.findAll('[data-test="budget-item-row"]')).toHaveLength(1);
    expect(source).toEqual([rentItem]);
    expect(vm(wrapper).items[0]).toMatchObject({ categoryId: 'c1', amount: 0 });
  });

  it('emits only the edited and remaining rows when saving', async () => {
    const wrapper = mountDialog([rentItem, foodItem]);

    await wrapper.find('[data-test="budget-item-amount"] input').setValue('950');
    await wrapper.find('[data-test="budget-item-note"] input').setValue('  Ajustada  ');
    await wrapper.findAll('[data-test="remove-budget-item"]')[1].trigger('click');
    await vm(wrapper).save();

    const emitted = wrapper.emitted('save') as [[CreateBudgetPayload]];
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0]).toEqual({
      month: '2026-09',
      items: [
        {
          categoryId: 'c1',
          type: 'expense',
          amount: 950,
          note: 'Ajustada',
        },
      ],
    });
  });

  it('omits whitespace-only notes from the saved payload', async () => {
    const wrapper = mountDialog([foodItem]);

    await wrapper.find('[data-test="budget-item-note"] input').setValue('   ');
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toEqual([
      [
        {
          month: '2026-09',
          items: [{ categoryId: 'c2', type: 'expense', amount: 500 }],
        },
      ],
    ]);
  });

  it('saves an added row with edited controls while preserving the remaining payload rows', async () => {
    const wrapper = mountDialog([rentItem, foodItem]);

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');
    const [addedCategory, addedType] = wrapper
      .findAllComponents({ name: 'VSelect' })
      .slice(-2);
    await addedCategory.vm.$emit('update:modelValue', 'c2');
    await addedType.vm.$emit('update:modelValue', 'income');
    await wrapper.findAll('[data-test="budget-item-amount"]')
      .slice(-1)[0]
      .find('input')
      .setValue('3000');
    await wrapper.findAll('[data-test="budget-item-note"]')
      .slice(-1)[0]
      .find('input')
      .setValue('  Bonus  ');
    await wrapper.findAll('[data-test="remove-budget-item"]')[1].trigger('click');
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toEqual([
      [
        {
          month: '2026-09',
          items: [
            rentItem,
            {
              categoryId: 'c2',
              type: 'income',
              amount: 3000,
              note: 'Bonus',
            },
          ],
        },
      ],
    ]);
  });

  it('allows deleting every proposed row and sends an empty list', async () => {
    const wrapper = mountDialog([rentItem]);

    await wrapper.find('[data-test="remove-budget-item"]').trigger('click');
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toEqual([
      [{ month: '2026-09', items: [] }],
    ]);
  });

  it.each([0, -1])('does not emit an invalid %s-amount row', async (amount) => {
    const wrapper = mountDialog([]);

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');
    await wrapper.find('[data-test="budget-item-amount"] input').setValue(String(amount));
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.text()).toContain('Amount must be greater than zero');
  });

  it('closes without saving', () => {
    const wrapper = mountDialog();

    vm(wrapper).close();

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    expect(wrapper.emitted('save')).toBeUndefined();
  });
});
