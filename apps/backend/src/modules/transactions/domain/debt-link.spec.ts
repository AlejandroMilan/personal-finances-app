import { buildDebtLink, toDebtLinkRequest } from './debt-link';
import { TransactionType } from './transaction-type.enum';
import { TransactionError } from './transaction.error';

describe('buildDebtLink', () => {
  it('computes the interest of a payment as amount minus capital', () => {
    const link = buildDebtLink(TransactionType.EXPENSE, 120, {
      kind: 'payment',
      debtId: 'd1',
      capitalAmount: 100.004,
    });

    expect(link).toEqual({
      kind: 'payment',
      debtId: 'd1',
      capitalAmount: 100,
      interestAmount: 20,
    });
  });

  it.each([0, -5, 121, Number.NaN, undefined])(
    'rejects a payment whose capital is invalid (%p)',
    (capitalAmount) => {
      expect(() =>
        buildDebtLink(TransactionType.EXPENSE, 120, {
          kind: 'payment',
          debtId: 'd1',
          capitalAmount,
        }),
      ).toThrow(TransactionError);
    },
  );

  it('rejects a payment on a non-expense transaction', () => {
    expect(() =>
      buildDebtLink(TransactionType.INCOME, 120, {
        kind: 'payment',
        debtId: 'd1',
        capitalAmount: 100,
      }),
    ).toThrow('Only expense transactions can pay a debt');
  });

  it('uses the received amount as capital of an increase and the extra interest as interest', () => {
    const link = buildDebtLink(TransactionType.INCOME, 1000, {
      kind: 'increase',
      debtId: 'd1',
      interestAmount: 50.5,
    });

    expect(link).toEqual({
      kind: 'increase',
      debtId: 'd1',
      capitalAmount: 1000,
      interestAmount: 50.5,
    });
  });

  it('defaults the increase interest to zero', () => {
    const link = buildDebtLink(TransactionType.INCOME, 1000, {
      kind: 'increase',
      debtId: 'd1',
    });
    expect(link.interestAmount).toBe(0);
  });

  it('rejects an increase on a non-income transaction or a negative interest', () => {
    expect(() =>
      buildDebtLink(TransactionType.EXPENSE, 10, {
        kind: 'increase',
        debtId: 'd1',
      }),
    ).toThrow('Only income transactions can increase a debt');
    expect(() =>
      buildDebtLink(TransactionType.INCOME, 10, {
        kind: 'increase',
        debtId: 'd1',
        interestAmount: -1,
      }),
    ).toThrow(TransactionError);
  });
});

describe('toDebtLinkRequest', () => {
  it('turns a payment link back into a request that recomputes its interest', () => {
    expect(
      toDebtLinkRequest({
        kind: 'payment',
        debtId: 'd1',
        capitalAmount: 100,
        interestAmount: 20,
      }),
    ).toEqual({ kind: 'payment', debtId: 'd1', capitalAmount: 100 });
  });

  it('turns an increase link back into a request with its interest', () => {
    expect(
      toDebtLinkRequest({
        kind: 'increase',
        debtId: 'd1',
        capitalAmount: 1000,
        interestAmount: 50,
      }),
    ).toEqual({ kind: 'increase', debtId: 'd1', interestAmount: 50 });
  });
});
