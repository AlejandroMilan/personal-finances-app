import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// jsdom no implementa canvas: sustituimos la gráfica por un stub que expone
// los datos que recibe, que es justo lo que queremos verificar.
vi.mock('vue-chartjs', () => ({
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<div data-test="donut-chart" />',
  },
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div data-test="line-chart" />',
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import type { DonutData } from '../../utils/summary';
import CategoryDonutCard from './CategoryDonutCard.vue';

const expenses: DonutData = {
  slices: [
    { label: 'Comida', value: 120, color: '#2E6B4F' },
    { label: 'Transporte', value: 80.5, color: '#7FA56E' },
  ],
  total: 200.5,
  isEmpty: false,
};

const empty: DonutData = { slices: [], total: 0, isEmpty: true };

const mountCard = (data: DonutData, title = 'Gastos por categoría') =>
  mount(CategoryDonutCard, {
    ...mountOptions,
    props: { title, icon: 'mdi-arrow-down', data },
  });

describe('CategoryDonutCard', () => {
  it('serves both expenses and income from the same component', () => {
    const expenseCard = mountCard(expenses, 'Gastos por categoría');
    const incomeCard = mountCard(
      { slices: [{ label: 'Sueldo', value: 900, color: '#3E7C4F' }], total: 900, isEmpty: false },
      'Ingresos por categoría',
    );

    expect(expenseCard.text()).toContain('Gastos por categoría');
    expect(incomeCard.text()).toContain('Ingresos por categoría');
    expect(incomeCard.text()).toContain('Sueldo');
  });

  it('shows the period total at the centre formatted as currency', () => {
    const wrapper = mountCard(expenses);

    expect(wrapper.find('[data-test="donut-total"]').text()).toContain('$200.50');
  });

  it('paints every slice with the colour of its category', () => {
    const wrapper = mountCard(expenses);
    const chart = wrapper.findComponent({ name: 'Doughnut' });

    expect(chart.props('data').datasets[0].backgroundColor).toEqual([
      '#2E6B4F',
      '#7FA56E',
    ]);
    expect(chart.props('data').labels).toEqual(['Comida', 'Transporte']);
  });

  it('lists every category name in the legend', () => {
    const wrapper = mountCard(expenses);
    const legend = wrapper.find('[data-test="donut-legend"]');

    expect(legend.text()).toContain('Comida');
    expect(legend.text()).toContain('Transporte');
    expect(legend.text()).toContain('$120.00');
  });

  it('shows an empty state with a zero total when there are no movements', () => {
    const wrapper = mountCard(empty);

    expect(wrapper.find('[data-test="donut-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-legend"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-total"]').text()).toContain('$0.00');
    expect(wrapper.text()).toContain('Sin movimientos en este periodo');
  });

  it('shows a loading indicator instead of the chart while loading', () => {
    const wrapper = mount(CategoryDonutCard, {
      ...mountOptions,
      props: {
        title: 'Gastos',
        icon: 'mdi-arrow-down',
        data: expenses,
        loading: true,
      },
    });

    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(
      true,
    );
  });

  it('renders a doughnut with a hole for the centred total', () => {
    const wrapper = mountCard(expenses);
    const options = wrapper.findComponent({ name: 'Doughnut' }).props('options');

    expect(options.cutout).toBe('70%');
    expect(options.plugins.legend.display).toBe(false);
  });

  it('does not fetch or aggregate anything by itself', () => {
    const wrapper = mountCard(expenses);
    const chart = wrapper.findComponent({ name: 'Doughnut' });

    // Los valores llegan tal cual desde las props, sin recalcular.
    expect(chart.props('data').datasets[0].data).toEqual([120, 80.5]);
  });
});
