import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mountOptions } from '../../test-utils/vuetify';
import type { PeriodKind, PeriodRange } from '../../utils/period';
import PeriodFilter from './PeriodFilter.vue';

const mountFilter = (kind: PeriodKind = 'month') =>
  mount(PeriodFilter, { ...mountOptions, props: { kind } });

const emittedRanges = (wrapper: ReturnType<typeof mountFilter>): PeriodRange[] =>
  (wrapper.emitted('select') ?? []).map((event) => (event as [PeriodRange])[0]);

describe('PeriodFilter', () => {
  it('shows the day, week, month, year and custom options', () => {
    const wrapper = mountFilter();
    const text = wrapper.text();

    expect(text).toContain('Día');
    expect(text).toContain('Semana');
    expect(text).toContain('Mes');
    expect(text).toContain('Año');
    expect(text).toContain('Personalizado');
  });

  it('highlights the month option when it is the selected one', () => {
    const wrapper = mountFilter('month');

    const month = wrapper.find('[data-test="preset-month"]');
    const year = wrapper.find('[data-test="preset-year"]');

    expect(month.classes().join(' ')).toContain('v-chip--variant-flat');
    expect(year.classes().join(' ')).toContain('v-chip--variant-tonal');
  });

  it('emits the range resolved by the period utilities when picking a preset', async () => {
    const wrapper = mountFilter();

    await wrapper.find('[data-test="preset-year"]').trigger('click');

    const [range] = emittedRanges(wrapper);
    expect(range.kind).toBe('year');
    expect(range.granularity).toBe('month');
    expect(range.from.getMonth()).toBe(0);
    expect(range.from.getDate()).toBe(1);
    expect(range.to.getMonth()).toBe(11);
  });

  it('emits a whole day range for the day preset', async () => {
    const wrapper = mountFilter();

    await wrapper.find('[data-test="preset-day"]').trigger('click');

    const [range] = emittedRanges(wrapper);
    expect(range.kind).toBe('day');
    expect(range.granularity).toBe('hour');
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getHours()).toBe(23);
  });

  it('opens the custom dialog with two date fields', async () => {
    const wrapper = mountFilter();

    await wrapper.find('[data-test="preset-custom"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(document.querySelector('[data-test="custom-from"]')).not.toBeNull();
    expect(document.querySelector('[data-test="custom-to"]')).not.toBeNull();
  });

  it('does not emit a custom range when the start is after the end', async () => {
    const wrapper = mountFilter();

    await wrapper.findComponent(PeriodFilter).vm.$nextTick();
    const vm = wrapper.vm as unknown as {
      customFrom: string;
      customTo: string;
      applyCustom: () => void;
    };
    vm.customFrom = '2026-08-20';
    vm.customTo = '2026-08-01';
    await wrapper.vm.$nextTick();
    vm.applyCustom();

    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('emits the expanded custom range when the dates are valid', async () => {
    const wrapper = mountFilter();
    const vm = wrapper.vm as unknown as {
      customFrom: string;
      customTo: string;
      applyCustom: () => void;
    };

    vm.customFrom = '2026-08-01';
    vm.customTo = '2026-08-05';
    await wrapper.vm.$nextTick();
    vm.applyCustom();

    const [range] = emittedRanges(wrapper);
    expect(range.kind).toBe('custom');
    expect(range.from.getDate()).toBe(1);
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getDate()).toBe(5);
    expect(range.to.getHours()).toBe(23);
    expect(range.granularity).toBe('day');
  });

  it('does not perform any HTTP request on its own', () => {
    const fetchSpy = globalThis.fetch;
    mountFilter();

    expect(fetchSpy).toBe(globalThis.fetch);
  });
});
