import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// jsdom no implementa canvas: sustituimos la gráfica por un stub que expone
// los datos que recibe, que es justo lo que queremos verificar.
vi.mock('vue-chartjs', () => ({
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<div data-test="donut-chart" />',
  },
}));

import { mountOptions } from '../../test-utils/vuetify';
import type { AccountView } from '../../types/account';
import LiquidityCard from './LiquidityCard.vue';
import liquidityCardSource from './LiquidityCard.vue?raw';

const makeAccount = (overrides: Partial<AccountView> = {}): AccountView => ({
  id: 'cash-id',
  name: 'Cash',
  balance: 0,
  color: '#2E6B4F',
  type: 'cash',
  creditCard: null,
  ...overrides,
});

const liquidityAccounts: AccountView[] = [
  makeAccount({
    id: 'cash-id',
    name: 'Cash',
    balance: 1200.5,
    color: '#2E6B4F',
  }),
  makeAccount({
    id: 'debit-id',
    name: 'Debit account',
    balance: 350,
    color: '#7FA56E',
    type: 'debit',
  }),
  makeAccount({
    id: 'credit-id',
    name: 'Credit card',
    color: '#2F6D80',
    type: 'credit',
    creditCard: {
      id: 'card-id',
      creditLimit: 1000,
      usedAmount: 275,
      cutoffDate: '2026-08-20',
      paymentDate: '2026-08-28',
    },
  }),
];

const mountCard = (
  accounts: readonly AccountView[] = liquidityAccounts,
  loading = false,
) =>
  mount(LiquidityCard, {
    ...mountOptions,
    props: { accounts, loading },
  });

describe('LiquidityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the formatted total and one doughnut slice per liquid account', () => {
    const wrapper = mountCard();
    const chart = wrapper.findComponent({ name: 'Doughnut' });
    const data = chart.props('data');

    expect(wrapper.find('[data-test="donut-total"]').text()).toContain(
      '$2,275.50',
    );
    expect(data.labels).toEqual(['Cash', 'Debit account', 'Credit card']);
    expect(data.datasets[0].data).toEqual([1200.5, 350, 725]);
    expect(data.datasets[0].backgroundColor).toEqual([
      '#2E6B4F',
      '#7FA56E',
      '#2F6D80',
    ]);
  });

  it('lists each liquid account with its formatted amount and colour in the legend', () => {
    const wrapper = mountCard();
    const legend = wrapper.find('[data-test="donut-legend"]');
    const items = legend.findAll('li');
    const dots = legend.findAll('.donut-legend__dot');

    expect(items).toHaveLength(3);
    expect(legend.text()).toContain('Cash');
    expect(legend.text()).toContain('$1,200.50');
    expect(legend.text()).toContain('Debit account');
    expect(legend.text()).toContain('$350.00');
    expect(legend.text()).toContain('Credit card');
    expect(legend.text()).toContain('$725.00');
    expect(dots.map((dot) => dot.attributes('style'))).toEqual([
      'background-color: rgb(46, 107, 79);',
      'background-color: rgb(127, 165, 110);',
      'background-color: rgb(47, 109, 128);',
    ]);
  });

  it('excludes accounts with zero liquidity from the doughnut and legend', () => {
    const zeroLiquidityAccount = makeAccount({
      id: 'zero-id',
      name: 'Empty wallet',
      balance: 0,
      color: '#C98A2D',
    });
    const wrapper = mountCard([...liquidityAccounts, zeroLiquidityAccount]);
    const chart = wrapper.findComponent({ name: 'Doughnut' });
    const legend = wrapper.find('[data-test="donut-legend"]');

    expect(chart.props('data').labels).not.toContain('Empty wallet');
    expect(chart.props('data').datasets[0].data).not.toContain(0);
    expect(legend.text()).not.toContain('Empty wallet');
    expect(legend.findAll('li')).toHaveLength(3);
  });

  it('shows a loading indicator instead of the doughnut while accounts load', () => {
    const wrapper = mountCard(liquidityAccounts, true);

    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(
      true,
    );
  });

  it('shows an empty state for no accounts without console errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountCard([]);

    expect(wrapper.find('[data-test="donut-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-legend"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-total"]').text()).toContain('$0.00');
    expect(wrapper.text()).toContain('Sin cuentas con liquidez disponible');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows an empty state when the total liquidity is zero without console errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const accountsWithZeroTotal = [
      makeAccount({ id: 'positive-id', name: 'Positive', balance: 100 }),
      makeAccount({
        id: 'negative-id',
        name: 'Negative',
        balance: -100,
        color: '#B3261E',
      }),
    ];
    const wrapper = mountCard(accountsWithZeroTotal);

    expect(wrapper.find('[data-test="donut-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="donut-chart"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-legend"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="donut-total"]').text()).toContain('$0.00');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('configures a responsive doughnut with a centred total and formatted tooltips', () => {
    const wrapper = mountCard();
    const options = wrapper.findComponent({ name: 'Doughnut' }).props('options');

    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
    expect(options.cutout).toBe('70%');
    expect(options.plugins.legend.display).toBe(false);
    expect(
      options.plugins.tooltip.callbacks.label({
        label: 'Credit card',
        parsed: 725,
      }),
    ).toBe('Credit card: $725.00');
  });

  it('does not import stores or services or perform HTTP requests', () => {
    expect(liquidityCardSource).not.toMatch(/from ['"][^'"]*(?:stores|services)[^'"]*['"]/);
    expect(liquidityCardSource).not.toMatch(/\b(?:fetch|axios)\b/);
  });
});
