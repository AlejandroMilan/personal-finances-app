import { describe, expect, it } from 'vitest';
import type { AccountView } from '../types/account';
import { accountLiquidity, buildLiquidity } from './liquidity';

function makeAccount(overrides: Partial<AccountView> = {}): AccountView {
  return {
    id: 'account-1',
    name: 'Everyday account',
    balance: 100,
    color: '#2E6B4F',
    type: 'cash',
    creditCard: null,
    ...overrides,
  };
}

function makeCreditCard(
  overrides: Partial<NonNullable<AccountView['creditCard']>> = {},
): NonNullable<AccountView['creditCard']> {
  return {
    id: 'card-1',
    creditLimit: 1000,
    usedAmount: 250,
    cutoffDate: '2026-08-20',
    paymentDate: '2026-08-30',
    ...overrides,
  };
}

describe('accountLiquidity', () => {
  it.each(['cash', 'debit'] as const)(
    'returns the balance for %s accounts',
    (type) => {
      expect(
        accountLiquidity(
          makeAccount({ type, balance: 123.45, creditCard: null }),
        ),
      ).toBe(123.45);
    },
  );

  it('returns the available credit for a credit account', () => {
    expect(
      accountLiquidity(
        makeAccount({
          type: 'credit',
          creditCard: makeCreditCard({ creditLimit: 1200, usedAmount: 275.5 }),
        }),
      ),
    ).toBe(924.5);
  });

  it('returns zero when a credit account has no card details', () => {
    expect(
      accountLiquidity(makeAccount({ type: 'credit', creditCard: null })),
    ).toBe(0);
  });

  it('does not return negative liquidity for an overdrawn card', () => {
    expect(
      accountLiquidity(
        makeAccount({
          type: 'credit',
          creditCard: makeCreditCard({ creditLimit: 500, usedAmount: 650 }),
        }),
      ),
    ).toBe(0);
  });
});

describe('buildLiquidity', () => {
  it('returns an empty result for an account list with no accounts', () => {
    expect(buildLiquidity([])).toEqual({
      slices: [],
      total: 0,
      isEmpty: true,
    });
  });

  it('excludes zero-liquidity accounts while summing the remaining accounts', () => {
    const data = buildLiquidity([
      makeAccount({
        id: 'zero-balance',
        name: 'Empty wallet',
        balance: 0,
      }),
      makeAccount({
        id: 'missing-card',
        name: 'Unlinked card',
        type: 'credit',
        creditCard: null,
      }),
      makeAccount({
        id: 'overdrawn-card',
        name: 'Overdrawn card',
        type: 'credit',
        creditCard: makeCreditCard({ creditLimit: 200, usedAmount: 300 }),
      }),
      makeAccount({
        id: 'debit-account',
        name: 'Debit account',
        type: 'debit',
        balance: 80,
      }),
      makeAccount({
        id: 'credit-account',
        name: 'Available card',
        type: 'credit',
        creditCard: makeCreditCard({ creditLimit: 400, usedAmount: 125 }),
      }),
    ]);

    expect(data.slices).toEqual([
      { label: 'Debit account', value: 80, color: '#2E6B4F' },
      { label: 'Available card', value: 275, color: '#2E6B4F' },
    ]);
    expect(data.total).toBe(355);
    expect(data.isEmpty).toBe(false);
  });

  it.each(['cash', 'debit'] as const)(
    'keeps negative liquidity from %s accounts as a slice and subtracts it from the total',
    (type) => {
      const data = buildLiquidity([
        makeAccount({
          id: 'negative-account',
          name: 'Overdrawn account',
          type,
          balance: -50,
        }),
        makeAccount({
          id: 'positive-account',
          name: 'Positive account',
          balance: 200,
        }),
      ]);

      expect(data.slices).toEqual([
        { label: 'Overdrawn account', value: -50, color: '#2E6B4F' },
        { label: 'Positive account', value: 200, color: '#2E6B4F' },
      ]);
      expect(data.total).toBe(150);
      expect(data.isEmpty).toBe(false);
    },
  );

  it('reports an empty result when non-empty slices have a net total of zero', () => {
    const data = buildLiquidity([
      makeAccount({
        id: 'negative-account',
        name: 'Overdrawn account',
        balance: -100,
      }),
      makeAccount({
        id: 'positive-account',
        name: 'Positive account',
        balance: 100,
      }),
    ]);

    expect(data.slices).toEqual([
      { label: 'Overdrawn account', value: -100, color: '#2E6B4F' },
      { label: 'Positive account', value: 100, color: '#2E6B4F' },
    ]);
    expect(data.total).toBe(0);
    expect(data.isEmpty).toBe(true);
  });

  it('preserves each account name and color and rounds the total to cents', () => {
    const data = buildLiquidity([
      makeAccount({
        id: 'wallet',
        name: 'Travel wallet',
        color: '#D9A441',
        balance: 0.1,
      }),
      makeAccount({
        id: 'reserve',
        name: 'Rainy-day reserve',
        color: '#7FA56E',
        balance: 0.2,
      }),
    ]);

    expect(data.slices).toEqual([
      { label: 'Travel wallet', value: 0.1, color: '#D9A441' },
      { label: 'Rainy-day reserve', value: 0.2, color: '#7FA56E' },
    ]);
    expect(data.total).toBe(0.3);
    expect(Number.isFinite(data.total)).toBe(true);
    expect(data.slices.every((slice) => Number.isFinite(slice.value))).toBe(
      true,
    );
  });
});
