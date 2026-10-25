import { DebtError } from '../debt.error';
import { DebtPaymentMode } from '../debt-payment-mode.enum';
import { Debt } from './debt.entity';

describe('Debt', () => {
  const base = {
    userId: 'u1',
    name: '  Tarjeta  ',
    totalAmount: 1000.456,
    revolving: true,
  };

  it('creates a debt with trimmed name, rounded total and capital mode by default', () => {
    const debt = Debt.create(base);

    expect(debt.name).toBe('Tarjeta');
    expect(debt.totalAmount).toBe(1000.46);
    expect(debt.paymentMode).toBe(DebtPaymentMode.CAPITAL);
    expect(debt.annualInterestRate).toBeNull();
    expect(debt.id).toEqual(expect.any(String));
  });

  it('keeps an explicit payment mode and interest rate', () => {
    const debt = Debt.create({
      ...base,
      annualInterestRate: 35.5,
      paymentMode: DebtPaymentMode.TOTAL,
    });

    expect(debt.annualInterestRate).toBe(35.5);
    expect(debt.paymentMode).toBe(DebtPaymentMode.TOTAL);
  });

  it('rejects an empty name', () => {
    expect(() => Debt.create({ ...base, name: '   ' })).toThrow(DebtError);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid total amount (%p)',
    (totalAmount) => {
      expect(() => Debt.create({ ...base, totalAmount })).toThrow(DebtError);
    },
  );

  it.each([-0.1, 100.1, Number.NaN])('rejects an invalid rate (%p)', (rate) => {
    expect(() => Debt.create({ ...base, annualInterestRate: rate })).toThrow(
      DebtError,
    );
  });

  it('updates only the provided fields and keeps the balance', () => {
    const debt = Debt.create({ ...base, annualInterestRate: 10 });

    const updated = debt.update({
      name: 'Nuevo',
      annualInterestRate: null,
      paymentMode: DebtPaymentMode.TOTAL,
    });

    expect(updated.name).toBe('Nuevo');
    expect(updated.annualInterestRate).toBeNull();
    expect(updated.paymentMode).toBe(DebtPaymentMode.TOTAL);
    expect(updated.revolving).toBe(true);
    expect(updated.totalAmount).toBe(debt.totalAmount);
    expect(updated.id).toBe(debt.id);
  });

  it('keeps the existing values when update receives undefined', () => {
    const debt = Debt.create({ ...base, annualInterestRate: 12 });

    const updated = debt.update({});

    expect(updated.name).toBe(debt.name);
    expect(updated.annualInterestRate).toBe(12);
    expect(updated.paymentMode).toBe(debt.paymentMode);
  });

  it('rejects an invalid name or rate during update', () => {
    const debt = Debt.create(base);
    expect(() => debt.update({ name: ' ' })).toThrow(DebtError);
    expect(() => debt.update({ annualInterestRate: 200 })).toThrow(DebtError);
  });

  it('applies a delta returning a new instance', () => {
    const debt = Debt.create(base);

    const next = debt.applyDelta(-0.456);

    expect(next.totalAmount).toBe(1000);
    expect(debt.totalAmount).toBe(1000.46);
  });

  it('refuses a delta that would leave a negative or invalid balance', () => {
    const debt = Debt.create(base);

    expect(() => debt.applyDelta(-2000)).toThrow(DebtError);
    expect(() => debt.applyDelta(Number.NaN)).toThrow(DebtError);
  });

  it('restores persisted props unchanged', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const debt = Debt.restore({
      id: 'd1',
      userId: 'u1',
      name: 'Auto',
      totalAmount: 10,
      revolving: false,
      annualInterestRate: null,
      paymentMode: DebtPaymentMode.CAPITAL,
      createdAt,
      updatedAt: createdAt,
    });

    expect(debt.id).toBe('d1');
    expect(debt.createdAt).toBe(createdAt);
    expect(debt.updatedAt).toBe(createdAt);
    expect(debt.revolving).toBe(false);
  });
});
