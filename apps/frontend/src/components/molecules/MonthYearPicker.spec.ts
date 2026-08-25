import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import MonthYearPicker from './MonthYearPicker.vue';

const mountPicker = (modelValue = '2026-03') =>
  mount(MonthYearPicker, { ...mountOptions, props: { modelValue } });

const selected = (wrapper: ReturnType<typeof mountPicker>): string[] =>
  (wrapper.emitted('select') ?? []).map((event) => (event as [string])[0]);

describe('MonthYearPicker', () => {
  it('renders the twelve months of the visible year', () => {
    const wrapper = mountPicker();

    for (let month = 1; month <= 12; month += 1) {
      expect(wrapper.find(`[data-test="month-option-${month}"]`).exists()).toBe(
        true,
      );
    }
    expect(wrapper.find('[data-test="visible-year"]').text()).toBe('2026');
  });

  it('marks the month of the received value as the active one', () => {
    const wrapper = mountPicker('2026-03');

    const march = wrapper.find('[data-test="month-option-3"]');
    const april = wrapper.find('[data-test="month-option-4"]');

    expect(march.classes().join(' ')).toContain('v-btn--variant-flat');
    expect(april.classes().join(' ')).toContain('v-btn--variant-tonal');
  });

  it('emits the picked month of the visible year', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="month-option-3"]').trigger('click');

    expect(selected(wrapper)).toEqual(['2026-03']);
  });

  it('emits a single event per click', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="month-option-11"]').trigger('click');

    expect(selected(wrapper)).toEqual(['2026-11']);
  });

  it('moves the visible year without emitting a selection', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="previous-year"]').trigger('click');
    expect(wrapper.find('[data-test="visible-year"]').text()).toBe('2025');

    await wrapper.find('[data-test="next-year"]').trigger('click');
    await wrapper.find('[data-test="next-year"]').trigger('click');
    expect(wrapper.find('[data-test="visible-year"]').text()).toBe('2027');

    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('emits the month of the year being browsed, not of the selected value', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="next-year"]').trigger('click');
    await wrapper.find('[data-test="month-option-1"]').trigger('click');

    expect(selected(wrapper)).toEqual(['2027-01']);
  });

  it('shows no active month while browsing another year', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="next-year"]').trigger('click');

    const march = wrapper.find('[data-test="month-option-3"]');
    expect(march.classes().join(' ')).toContain('v-btn--variant-tonal');
  });

  it.each(['', 'not-a-month', '2026-13'])(
    'renders the current year and no active month for the invalid value %p',
    (value) => {
      const wrapper = mountPicker(value);

      expect(wrapper.find('[data-test="visible-year"]').text()).toBe(
        String(new Date().getFullYear()),
      );
      for (let month = 1; month <= 12; month += 1) {
        const button = wrapper.find(`[data-test="month-option-${month}"]`);
        expect(button.classes().join(' ')).toContain('v-btn--variant-tonal');
      }
    },
  );

  it('follows the value when it changes from the outside', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.setProps({ modelValue: '2028-07' });

    expect(wrapper.find('[data-test="visible-year"]').text()).toBe('2028');
    const july = wrapper.find('[data-test="month-option-7"]');
    expect(july.classes().join(' ')).toContain('v-btn--variant-flat');
  });

  it('keeps the browsed year when the value becomes invalid', async () => {
    const wrapper = mountPicker('2026-03');

    await wrapper.find('[data-test="next-year"]').trigger('click');
    await wrapper.setProps({ modelValue: '2026-1' });

    expect(wrapper.find('[data-test="visible-year"]').text()).toBe('2027');
  });
});
