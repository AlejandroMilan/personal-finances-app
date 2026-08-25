import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { CategoryView } from '../../types/category';
import type { BudgetItem, CreateBudgetPayload } from '../../types/budget';
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

  it('allows deleting every proposed row and sends an empty list', async () => {
    const wrapper = mountDialog([rentItem]);

    await wrapper.find('[data-test="remove-budget-item"]').trigger('click');
    await vm(wrapper).save();

    expect(wrapper.emitted('save')).toEqual([
      [{ month: '2026-09', items: [] }],
    ]);
  });

  it('does not emit an invalid zero-amount row', async () => {
    const wrapper = mountDialog([]);

    await wrapper.find('[data-test="add-budget-item"]').trigger('click');
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
