import { describe, expect, it } from 'vitest';
import {
  buildDebtLinkPayload,
  debtLinkError,
  debtLinkFormFrom,
  debtLinkKindFor,
  emptyDebtLinkForm,
  isDebtLinkActive,
  type DebtLinkForm,
} from './debt-link';

const payment: DebtLinkForm = {
  enabled: true,
  kind: 'payment',
  debtId: 'd1',
  capital: 100,
  extraInterest: 0,
};

const increase: DebtLinkForm = {
  enabled: true,
  kind: 'increase',
  debtId: 'd1',
  capital: 0,
  extraInterest: 25,
};

describe('debt link form', () => {
  it('maps the transaction type to the link kind', () => {
    expect(debtLinkKindFor('expense')).toBe('payment');
    expect(debtLinkKindFor('income')).toBe('increase');
    expect(debtLinkKindFor('transfer')).toBeNull();
  });

  it('is active only when enabled and matching the current type', () => {
    expect(isDebtLinkActive(payment, 'expense')).toBe(true);
    expect(isDebtLinkActive(payment, 'income')).toBe(false);
    expect(isDebtLinkActive(payment, 'transfer')).toBe(false);
    expect(isDebtLinkActive({ ...payment, enabled: false }, 'expense')).toBe(false);
  });

  it('restores the form from a saved link', () => {
    expect(debtLinkFormFrom(null)).toEqual(emptyDebtLinkForm());
    expect(
      debtLinkFormFrom({ kind: 'payment', debtId: 'd1', capitalAmount: 100, interestAmount: 20 }),
    ).toEqual({ enabled: true, kind: 'payment', debtId: 'd1', capital: 100, extraInterest: 20 });
  });

  it('validates the debt and the amounts of the active link', () => {
    expect(debtLinkError({ ...payment, debtId: null }, 'expense', 120)).toMatch(/Elige la deuda/);
    expect(debtLinkError(payment, 'expense', 120)).toBeNull();
    expect(debtLinkError({ ...payment, capital: 200 }, 'expense', 120)).toMatch(/no puede superar/);
    expect(debtLinkError({ ...increase, extraInterest: -1 }, 'income', 1000)).toMatch(/no es válido/);
    expect(debtLinkError(increase, 'income', 1000)).toBeNull();
    expect(debtLinkError(payment, 'income', 120)).toBeNull();
  });

  it('builds the payload of the active link', () => {
    expect(buildDebtLinkPayload(payment, 'expense', false)).toEqual({
      kind: 'payment',
      debtId: 'd1',
      capitalAmount: 100,
    });
    expect(buildDebtLinkPayload(increase, 'income', false)).toEqual({
      kind: 'increase',
      debtId: 'd1',
      interestAmount: 25,
    });
  });

  it('sends null to remove an existing link and omits the field otherwise', () => {
    expect(buildDebtLinkPayload({ ...payment, enabled: false }, 'expense', true)).toBeNull();
    expect(buildDebtLinkPayload({ ...payment, enabled: false }, 'expense', false)).toBeUndefined();
    expect(buildDebtLinkPayload(payment, 'transfer', true)).toBeNull();
    expect(buildDebtLinkPayload({ ...payment, debtId: null }, 'expense', false)).toBeUndefined();
  });
});
