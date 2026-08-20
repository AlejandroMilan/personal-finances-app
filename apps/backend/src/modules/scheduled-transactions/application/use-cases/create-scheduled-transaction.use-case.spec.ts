import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { CreateScheduledTransactionUseCase } from './create-scheduled-transaction.use-case';
import {
  aCategory,
  aScheduled,
  anAccount,
  accountRepositoryMock,
  categoryRepositoryMock,
  scheduledRepositoryMock,
} from './test-doubles';

describe('CreateScheduledTransactionUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  const accounts = accountRepositoryMock();
  const categories = categoryRepositoryMock();
  let useCase: CreateScheduledTransactionUseCase;

  const input = {
    userId: 'u1',
    accountId: 'a1',
    categoryId: 'c1',
    type: TransactionType.EXPENSE,
    title: '  Rent  ',
    amount: 12000,
    scheduledFor: new Date('2026-09-01T00:00:00.000Z'),
    recurring: true,
    tags: ['home'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateScheduledTransactionUseCase(
      scheduled,
      accounts,
      categories,
    );
    accounts.findById.mockResolvedValue(anAccount());
    categories.findById.mockResolvedValue(aCategory());
    scheduled.save.mockImplementation((entity: unknown) => entity);
  });

  it('creates a pending scheduled transaction', async () => {
    const result = await useCase.execute(input);

    expect(result.status).toBe(ScheduledTransactionStatus.PENDING);
    expect(result.title).toBe('Rent');
    expect(result.userId).toBe('u1');
    expect(result.recurring).toBe(true);
    expect(scheduled.save).toHaveBeenCalledTimes(1);
  });

  it('defaults recurring to false and tags to empty', async () => {
    const result = await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: TransactionType.INCOME,
      title: 'Payroll',
      amount: 25000,
      scheduledFor: input.scheduledFor,
    });

    expect(result.recurring).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.categoryId).toBeNull();
    expect(categories.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the account does not exist', async () => {
    accounts.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the account belongs to another user', async () => {
    accounts.findById.mockResolvedValue(anAccount('other'));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when the category does not exist', async () => {
    categories.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when the category belongs to another user', async () => {
    categories.findById.mockResolvedValue(aCategory('other'));

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
  });

  it('maps a domain error to BadRequestException', async () => {
    await expect(useCase.execute({ ...input, amount: 0 })).rejects.toThrow(
      BadRequestException,
    );
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it('rethrows unexpected errors from the repository', async () => {
    scheduled.save.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(input)).rejects.toThrow('boom');
  });

  it('persists the entity returned by the repository', async () => {
    const saved = aScheduled();
    scheduled.save.mockResolvedValue(saved);

    await expect(useCase.execute(input)).resolves.toBe(saved);
  });
});
