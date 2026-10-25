import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDebtDto } from './create-debt.dto';

describe('CreateDebtDto', () => {
  const base = { name: 'Card', totalAmount: 100, revolving: true };
  const check = async (overrides: Record<string, unknown>) =>
    validate(plainToInstance(CreateDebtDto, { ...base, ...overrides }));

  it('accepts a debt without interest rate', async () => {
    expect(await check({})).toHaveLength(0);
  });

  it('accepts a null or a bounded annual interest rate', async () => {
    expect(await check({ annualInterestRate: null })).toHaveLength(0);
    expect(await check({ annualInterestRate: 0 })).toHaveLength(0);
    expect(await check({ annualInterestRate: 100 })).toHaveLength(0);
  });

  it.each([-1, 100.5, 'abc'])(
    'rejects an invalid annual interest rate (%p)',
    async (annualInterestRate) => {
      expect(await check({ annualInterestRate })).not.toHaveLength(0);
    },
  );

  it('rejects an unknown payment mode', async () => {
    expect(await check({ paymentMode: 'mitad' })).not.toHaveLength(0);
  });
});
