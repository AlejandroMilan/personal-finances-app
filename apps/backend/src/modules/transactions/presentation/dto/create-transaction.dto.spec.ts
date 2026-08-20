import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TransactionType } from '../../domain/transaction-type.enum';
import { CreateTransactionDto } from './create-transaction.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(CreateTransactionDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

describe('CreateTransactionDto', () => {
  const valid = {
    title: 'Move money',
    amount: 75,
    type: TransactionType.TRANSFER,
    accountId: 'a1',
  };

  it('accepts a non-empty destination account id as an optional field', () => {
    expect(validate({ ...valid, destinationAccountId: 'a2' })).toHaveLength(0);
  });

  it('accepts a transaction without a destination account id', () => {
    expect(validate({ ...valid, type: TransactionType.EXPENSE })).toHaveLength(
      0,
    );
  });

  it('rejects an empty destination account id', () => {
    const errors = validate({ ...valid, destinationAccountId: '' });

    expect(errors.map((error) => error.property)).toContain(
      'destinationAccountId',
    );
  });

  it('rejects a destination account id that is not a string', () => {
    const errors = validate({ ...valid, destinationAccountId: 42 });

    expect(errors.map((error) => error.property)).toContain(
      'destinationAccountId',
    );
  });

  it('drops undeclared fields while keeping the destination account id', () => {
    const instance = plainToInstance(CreateTransactionDto, {
      ...valid,
      destinationAccountId: 'a2',
      userId: 'someone-else',
    });

    validateSync(instance, { whitelist: true });

    expect(instance.destinationAccountId).toBe('a2');
    expect(instance).not.toHaveProperty('userId');
  });

  it('uses the ValidationPipe whitelist without dropping the destination account id', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const transformed = await pipe.transform(
      {
        ...valid,
        destinationAccountId: 'a2',
        userId: 'someone-else',
      },
      { type: 'body', metatype: CreateTransactionDto },
    );

    expect(transformed).toBeInstanceOf(CreateTransactionDto);
    expect(transformed.destinationAccountId).toBe('a2');
    expect(transformed).not.toHaveProperty('userId');
  });
});
