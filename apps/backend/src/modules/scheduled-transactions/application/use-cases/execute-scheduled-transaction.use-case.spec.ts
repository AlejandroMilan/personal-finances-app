import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateTransactionUseCase } from '../../../transactions/application/use-cases/create-transaction.use-case';
import { Transaction } from '../../../transactions/domain/entities/transaction.entity';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionError } from '../../domain/scheduled-transaction.error';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { ExecuteScheduledTransactionUseCase } from './execute-scheduled-transaction.use-case';
import { aScheduled, scheduledRepositoryMock } from './test-doubles';

describe('ExecuteScheduledTransactionUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  const createTransaction = { execute: jest.fn() };
  let useCase: ExecuteScheduledTransactionUseCase;

  const input = { userId: 'u1', scheduledTransactionId: 's1' };

  const transaction = Transaction.restore({
    id: 't1',
    userId: 'u1',
    accountId: 'a1',
    categoryId: 'c1',
    type: TransactionType.EXPENSE,
    title: 'Rent',
    amount: 12000,
    timestamp: new Date('2026-08-20T00:00:00.000Z'),
    tags: ['home'],
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
  });

  const transfer = Transaction.restore({
    id: 't2',
    userId: 'u1',
    accountId: 'a1',
    destinationAccountId: 'a2',
    categoryId: null,
    type: TransactionType.TRANSFER,
    title: 'Move money',
    amount: 12000,
    timestamp: new Date('2026-08-20T00:00:00.000Z'),
    tags: ['home'],
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ExecuteScheduledTransactionUseCase(
      scheduled,
      createTransaction as unknown as CreateTransactionUseCase,
    );
    scheduled.findById.mockResolvedValue(aScheduled());
    scheduled.save.mockImplementation((entity: unknown) => entity);
    createTransaction.execute.mockResolvedValue(transaction);
  });

  it('creates the transaction through CreateTransactionUseCase with the scheduled data', async () => {
    const before = Date.now();

    const result = await useCase.execute(input);

    expect(createTransaction.execute).toHaveBeenCalledTimes(1);
    const [payload] = createTransaction.execute.mock.calls[0] as [
      {
        userId: string;
        accountId: string;
        destinationAccountId: string | null;
        categoryId: string | null;
        type: TransactionType;
        title: string;
        amount: number;
        timestamp: Date;
        tags: string[];
      },
    ];
    expect(payload.userId).toBe('u1');
    expect(payload.accountId).toBe('a1');
    expect(payload.destinationAccountId).toBeNull();
    expect(payload.categoryId).toBe('c1');
    expect(payload.type).toBe(TransactionType.EXPENSE);
    expect(payload.title).toBe('Rent');
    expect(payload.amount).toBe(12000);
    expect(payload.tags).toEqual(['home']);
    expect(payload.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.transaction).toBe(transaction);
  });

  it('applies the confirmed adjustments over the scheduled data', async () => {
    const timestamp = new Date('2026-08-19T10:00:00.000Z');

    await useCase.execute({
      ...input,
      amount: 12500,
      timestamp,
      accountId: 'a2',
      categoryId: 'c2',
    });

    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 12500,
        timestamp,
        accountId: 'a2',
        categoryId: 'c2',
      }),
    );
  });

  it('lets the confirmation clear the category', async () => {
    await useCase.execute({ ...input, categoryId: null });

    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null }),
    );
  });

  it('executes a scheduled transfer with its destination and no category', async () => {
    scheduled.findById.mockResolvedValue(
      aScheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );
    createTransaction.execute.mockResolvedValue(transfer);

    const result = await useCase.execute(input);

    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a1',
        destinationAccountId: 'a2',
        categoryId: null,
        type: TransactionType.TRANSFER,
      }),
    );
    expect(result.transaction.destinationAccountId).toBe('a2');
  });

  it('uses the confirmed destination when executing a scheduled transfer', async () => {
    scheduled.findById.mockResolvedValue(
      aScheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );
    createTransaction.execute.mockResolvedValue(transfer);

    await useCase.execute({ ...input, destinationAccountId: 'a3' });

    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({ destinationAccountId: 'a3' }),
    );
  });

  it('does not mark or reschedule when transaction creation rejects a foreign destination', async () => {
    scheduled.findById.mockResolvedValue(
      aScheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );
    createTransaction.execute.mockRejectedValue(
      new NotFoundException('Destination account not found'),
    );

    await expect(
      useCase.execute({
        ...input,
        destinationAccountId: 'other-account',
        reschedule: true,
        rescheduleFor: new Date('2026-10-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it('marks the scheduled transaction as executed with the created transaction id', async () => {
    const result = await useCase.execute(input);

    expect(result.scheduled.status).toBe(ScheduledTransactionStatus.EXECUTED);
    expect(result.scheduled.transactionId).toBe('t1');
  });

  it('does not schedule a next occurrence when it is not requested', async () => {
    const result = await useCase.execute({ ...input, reschedule: false });

    expect(result.next).toBeNull();
    expect(scheduled.save).toHaveBeenCalledTimes(1);
  });

  it('schedules the next occurrence as a recurring pending copy', async () => {
    const rescheduleFor = new Date('2026-10-01T00:00:00.000Z');

    const result = await useCase.execute({ ...input, rescheduleFor });

    expect(scheduled.save).toHaveBeenCalledTimes(2);
    expect(result.next).not.toBeNull();
    expect(result.next?.status).toBe(ScheduledTransactionStatus.PENDING);
    expect(result.next?.recurring).toBe(true);
    expect(result.next?.scheduledFor).toBe(rescheduleFor);
    expect(result.next?.title).toBe('Rent');
    expect(result.next?.amount).toBe(12000);
    expect(result.next?.accountId).toBe('a1');
    expect(result.next?.categoryId).toBe('c1');
    expect(result.next?.id).not.toBe('s1');
  });

  it('preserves both accounts when rescheduling a transfer', async () => {
    scheduled.findById.mockResolvedValue(
      aScheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );
    createTransaction.execute.mockResolvedValue(transfer);

    const result = await useCase.execute({ ...input, reschedule: true });

    expect(result.next?.accountId).toBe('a1');
    expect(result.next?.destinationAccountId).toBe('a2');
    expect(result.next?.categoryId).toBeNull();
  });

  it('schedules the next occurrence one month later when only the flag comes', async () => {
    const result = await useCase.execute({ ...input, reschedule: true });

    expect(scheduled.save).toHaveBeenCalledTimes(2);
    // La agendada de prueba está prevista para el 2026-09-01.
    expect(result.next?.scheduledFor.toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    expect(result.next?.recurring).toBe(true);
    expect(result.next?.status).toBe(ScheduledTransactionStatus.PENDING);
  });

  it('clamps the default next date to the last day of a shorter month', async () => {
    scheduled.findById.mockResolvedValue(
      aScheduled({ scheduledFor: new Date('2026-01-31T00:00:00.000Z') }),
    );

    const result = await useCase.execute({ ...input, reschedule: true });

    expect(result.next?.scheduledFor.toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });

  it('prefers the explicit date over the default, with the flag on', async () => {
    const rescheduleFor = new Date('2026-11-15T00:00:00.000Z');

    const result = await useCase.execute({
      ...input,
      reschedule: true,
      rescheduleFor,
    });

    expect(result.next?.scheduledFor).toBe(rescheduleFor);
  });

  it.each([
    ScheduledTransactionStatus.EXECUTED,
    ScheduledTransactionStatus.CANCELLED,
  ])(
    'throws ConflictException and creates nothing when the status is %s',
    async (status) => {
      scheduled.findById.mockResolvedValue(aScheduled({ status }));

      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
      expect(createTransaction.execute).not.toHaveBeenCalled();
      expect(scheduled.save).not.toHaveBeenCalled();
    },
  );

  it('throws NotFoundException when it does not exist', async () => {
    scheduled.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(createTransaction.execute).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when it belongs to another user', async () => {
    scheduled.findById.mockResolvedValue(aScheduled({ userId: 'other' }));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(createTransaction.execute).not.toHaveBeenCalled();
  });

  it('maps a domain error while marking as executed to ConflictException', async () => {
    const alreadyExecuted = aScheduled();
    jest.spyOn(alreadyExecuted, 'isPending').mockReturnValue(true);
    jest.spyOn(alreadyExecuted, 'markExecuted').mockImplementation(() => {
      throw new ScheduledTransactionError('already executed');
    });
    scheduled.findById.mockResolvedValue(alreadyExecuted);

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
  });

  it('rethrows unexpected repository errors', async () => {
    scheduled.save.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(input)).rejects.toThrow('boom');
  });
});
