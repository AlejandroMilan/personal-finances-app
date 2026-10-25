import { describe, expect, it } from 'vitest';
import {
  balanceSeries,
  debtShares,
  paymentCapitalError,
  paymentInterest,
  totalDebt,
} from './debt';
import type { Debt, DebtMovement } from '../types/debt';

const debt = (id: string, totalAmount: number): Debt => ({
  id,
  name: `Debt ${id}`,
  totalAmount,
  revolving: false,
  annualInterestRate: null,
  paymentMode: 'capital',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const movement = (
  id: string,
  debtId: string,
  occurredAt: string,
  balanceAfter: number,
): DebtMovement => ({
  id,
  debtId,
  kind: 'pago',
  delta: 0,
  amount: 0,
  capitalAmount: 0,
  interestAmount: 0,
  transactionId: null,
  occurredAt,
  balanceBefore: 0,
  balanceAfter,
});

describe('debt utils', () => {
  it('sums the total owed rounded to cents', () => {
    expect(totalDebt([debt('a', 100.1), debt('b', 200.2)])).toBe(300.3);
    expect(totalDebt([])).toBe(0);
  });

  it('computes each debt share of the total without NaN', () => {
    const shares = debtShares([debt('a', 300), debt('b', 100)]);
    expect(shares.map((share) => share.ratio)).toEqual([0.75, 0.25]);
    expect(debtShares([debt('a', 0)])[0].ratio).toBe(0);
    expect(debtShares([])).toEqual([]);
  });

  it('builds the total balance over time from the log', () => {
    const series = balanceSeries([
      movement('3', 'b', '2026-03-01T00:00:00.000Z', 80),
      movement('1', 'a', '2026-01-01T00:00:00.000Z', 1000),
      movement('2', 'a', '2026-02-01T00:00:00.000Z', 900),
    ]);

    expect(series).toEqual([
      { at: '2026-01-01T00:00:00.000Z', value: 1000 },
      { at: '2026-02-01T00:00:00.000Z', value: 900 },
      { at: '2026-03-01T00:00:00.000Z', value: 980 },
    ]);
  });

  it('follows a single debt using its own balances', () => {
    const series = balanceSeries(
      [
        movement('1', 'a', '2026-01-01T00:00:00.000Z', 1000),
        movement('2', 'b', '2026-01-15T00:00:00.000Z', 50),
        movement('3', 'a', '2026-02-01T00:00:00.000Z', 900),
      ],
      'a',
    );

    expect(series.map((point) => point.value)).toEqual([1000, 900]);
  });

  it('returns no points for an empty log', () => {
    expect(balanceSeries([])).toEqual([]);
  });

  it('computes the interest of a payment as the rest of the amount', () => {
    expect(paymentInterest(120, 100)).toBe(20);
    expect(paymentInterest(100.1, 100)).toBe(0.1);
  });

  it('validates the capital of a payment', () => {
    expect(paymentCapitalError(120, 100)).toBeNull();
    expect(paymentCapitalError(120, 0)).toMatch(/mayor que cero/);
    expect(paymentCapitalError(120, Number.NaN)).toMatch(/mayor que cero/);
    expect(paymentCapitalError(120, 121)).toMatch(/no puede superar/);
  });
});
