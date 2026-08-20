import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { UpdateScheduledTransactionUseCase } from './update-scheduled-transaction.use-case';
import {
  aCategory,
  aScheduled,
  anAccount,
  accountRepositoryMock,
  categoryRepositoryMock,
  scheduledRepositoryMock,
} from './test-doubles';

describe('UpdateScheduledTransactionUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  const accounts = accountRepositoryMock();
  const categories = categoryRepositoryMock();
  let useCase: UpdateScheduledTransactionUseCase;

  const base = { userId: 'u1', scheduledTransactionId: 's1' };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateScheduledTransactionUseCase(
      scheduled,
      accounts,
      categories,
    );
    scheduled.findById.mockResolvedValue(aScheduled());
    accounts.findById.mockResolvedValue(anAccount());
    categories.findById.mockResolvedValue(aCategory());
    scheduled.save.mockImplementation((entity: unknown) => entity);
  });

  it('updates the editable fields keeping the identity and status', async () => {
    const scheduledFor = new Date('2026-10-05T00:00:00.000Z');

    const result = await useCase.execute({
      ...base,
      title: '  New rent  ',
      amount: 13000,
      type: TransactionType.INCOME,
      scheduledFor,
      recurring: false,
      tags: ['  home  ', '  '],
    });

    expect(result.id).toBe('s1');
    expect(result.title).toBe('New rent');
    expect(result.amount).toBe(13000);
    expect(result.type).toBe(TransactionType.INCOME);
    expect(result.scheduledFor).toBe(scheduledFor);
    expect(result.recurring).toBe(false);
    expect(result.tags).toEqual(['home']);
    expect(result.status).toBe(ScheduledTransactionStatus.PENDING);
  });

  it('keeps the current values when nothing is provided', async () => {
    const result = await useCase.execute(base);

    expect(result.title).toBe('Rent');
    expect(result.amount).toBe(12000);
    expect(result.tags).toEqual(['home']);
    expect(result.categoryId).toBe('c1');
    expect(accounts.findById).not.toHaveBeenCalled();
    expect(categories.findById).not.toHaveBeenCalled();
  });

  it('clears the category when null is provided', async () => {
    const result = await useCase.execute({ ...base, categoryId: null });

    expect(result.categoryId).toBeNull();
    expect(categories.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when it does not exist', async () => {
    scheduled.findById.mockResolvedValue(null);

    await expect(useCase.execute(base)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when it belongs to another user', async () => {
    scheduled.findById.mockResolvedValue(aScheduled({ userId: 'other' }));

    await expect(useCase.execute(base)).rejects.toThrow(NotFoundException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it.each([
    ScheduledTransactionStatus.EXECUTED,
    ScheduledTransactionStatus.CANCELLED,
  ])('throws ConflictException when the status is %s', async (status) => {
    scheduled.findById.mockResolvedValue(aScheduled({ status }));

    await expect(useCase.execute(base)).rejects.toThrow(ConflictException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it('validates the ownership of a new account', async () => {
    accounts.findById.mockResolvedValue(anAccount('other'));

    await expect(useCase.execute({ ...base, accountId: 'a2' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('validates the ownership of a new category', async () => {
    categories.findById.mockResolvedValue(aCategory('other'));

    await expect(
      useCase.execute({ ...base, categoryId: 'c2' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a new account and category owned by the user', async () => {
    const result = await useCase.execute({
      ...base,
      accountId: 'a2',
      categoryId: 'c2',
    });

    expect(result.accountId).toBe('a2');
    expect(result.categoryId).toBe('c2');
    expect(accounts.findById).toHaveBeenCalledWith('a2');
    expect(categories.findById).toHaveBeenCalledWith('c2');
  });

  it.each([0, -5])('rejects an amount of %p', async (amount) => {
    await expect(useCase.execute({ ...base, amount })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a blank title', async () => {
    await expect(useCase.execute({ ...base, title: '   ' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
