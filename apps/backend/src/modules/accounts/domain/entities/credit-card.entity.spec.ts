import { CreditCard } from './credit-card.entity';

describe('CreditCard', () => {
  it('creates a credit card with generated id', () => {
    const card = CreditCard.create({
      accountId: 'a1',
      creditLimit: 5000,
      usedAmount: 1200,
      cutoffDate: new Date('2026-08-15T00:00:00.000Z'),
      paymentDate: new Date('2026-09-05T00:00:00.000Z'),
    });

    expect(card.id).toBeTruthy();
    expect(card.accountId).toBe('a1');
    expect(card.creditLimit).toBe(5000);
    expect(card.usedAmount).toBe(1200);
    expect(card.cutoffDate).toEqual(new Date('2026-08-15T00:00:00.000Z'));
    expect(card.paymentDate).toEqual(new Date('2026-09-05T00:00:00.000Z'));
  });

  it('restores a credit card from persistence', () => {
    const cutoffDate = new Date('2026-08-15T00:00:00.000Z');
    const card = CreditCard.restore({
      id: 'c1',
      accountId: 'a1',
      creditLimit: 5000,
      usedAmount: 0,
      cutoffDate,
      paymentDate: new Date('2026-09-05T00:00:00.000Z'),
    });

    expect(card.id).toBe('c1');
    expect(card.usedAmount).toBe(0);
    expect(card.cutoffDate).toBe(cutoffDate);
  });
});
