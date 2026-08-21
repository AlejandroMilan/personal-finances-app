import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { Transaction } from '../../transactions/domain/entities/transaction.entity';
import { TransactionType } from '../../transactions/domain/transaction-type.enum';
import { CancelScheduledTransactionUseCase } from '../application/use-cases/cancel-scheduled-transaction.use-case';
import { CreateScheduledTransactionUseCase } from '../application/use-cases/create-scheduled-transaction.use-case';
import { DeleteScheduledTransactionUseCase } from '../application/use-cases/delete-scheduled-transaction.use-case';
import { ExecuteScheduledTransactionUseCase } from '../application/use-cases/execute-scheduled-transaction.use-case';
import { ListScheduledTransactionsUseCase } from '../application/use-cases/list-scheduled-transactions.use-case';
import { UpdateScheduledTransactionUseCase } from '../application/use-cases/update-scheduled-transaction.use-case';
import { ScheduledTransaction } from '../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../domain/scheduled-transaction-status.enum';
import { ScheduledTransactionsController } from './scheduled-transactions.controller';

describe('ScheduledTransactionsController', () => {
  let controller: ScheduledTransactionsController;
  const createScheduled = { execute: jest.fn() };
  const listScheduled = { execute: jest.fn() };
  const updateScheduled = { execute: jest.fn() };
  const deleteScheduled = { execute: jest.fn() };
  const executeScheduled = { execute: jest.fn() };
  const cancelScheduled = { execute: jest.fn() };

  const user = { id: 'u1', email: 'ana@mail.com' };
  const scheduledFor = new Date('2026-09-01T00:00:00.000Z');

  const scheduled = (
    overrides: Partial<{
      id: string;
      status: ScheduledTransactionStatus;
      transactionId: string | null;
      destinationAccountId: string | null;
      categoryId: string | null;
      type: TransactionType;
    }> = {},
  ) =>
    ScheduledTransaction.restore({
      id: 's1',
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: null,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Rent',
      amount: 12000,
      tags: ['home'],
      scheduledFor,
      recurring: true,
      status: ScheduledTransactionStatus.PENDING,
      transactionId: null,
      createdAt: scheduledFor,
      updatedAt: scheduledFor,
      ...overrides,
    });

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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledTransactionsController],
      providers: [
        {
          provide: CreateScheduledTransactionUseCase,
          useValue: createScheduled,
        },
        { provide: ListScheduledTransactionsUseCase, useValue: listScheduled },
        {
          provide: UpdateScheduledTransactionUseCase,
          useValue: updateScheduled,
        },
        {
          provide: DeleteScheduledTransactionUseCase,
          useValue: deleteScheduled,
        },
        {
          provide: ExecuteScheduledTransactionUseCase,
          useValue: executeScheduled,
        },
        {
          provide: CancelScheduledTransactionUseCase,
          useValue: cancelScheduled,
        },
        {
          provide: TOKEN_SERVICE,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ScheduledTransactionsController>(
      ScheduledTransactionsController,
    );
  });

  it('is mounted on /scheduled-transactions behind the JWT guard', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      ScheduledTransactionsController,
    ) as string;
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ScheduledTransactionsController,
    ) as unknown[];

    expect(path).toBe('scheduled-transactions');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('creates a scheduled transaction taking the user from the token', async () => {
    createScheduled.execute.mockResolvedValue(scheduled());

    const response = await controller.create(user, {
      title: 'Rent',
      amount: 12000,
      type: TransactionType.EXPENSE,
      accountId: 'a1',
      destinationAccountId: undefined,
      categoryId: 'c1',
      scheduledFor: '2026-09-01T00:00:00.000Z',
      recurring: true,
      tags: ['home'],
    });

    expect(createScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: undefined,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Rent',
      amount: 12000,
      scheduledFor,
      recurring: true,
      tags: ['home'],
    });
    expect(response).toEqual({
      id: 's1',
      accountId: 'a1',
      destinationAccountId: null,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Rent',
      amount: 12000,
      tags: ['home'],
      scheduledFor,
      recurring: true,
      status: ScheduledTransactionStatus.PENDING,
      transactionId: null,
    });
  });

  it('creates a scheduled transfer propagating its destination', async () => {
    createScheduled.execute.mockResolvedValue(
      scheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );

    const response = await controller.create(user, {
      title: 'Move money',
      amount: 75,
      type: TransactionType.TRANSFER,
      accountId: 'a1',
      destinationAccountId: 'a2',
      scheduledFor: '2026-09-01T00:00:00.000Z',
    });

    expect(createScheduled.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        accountId: 'a1',
        destinationAccountId: 'a2',
        type: TransactionType.TRANSFER,
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        type: TransactionType.TRANSFER,
        accountId: 'a1',
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );
  });

  it.each([TransactionType.INCOME, TransactionType.EXPENSE])(
    'serializes a null destination for a scheduled %s',
    async (type) => {
      createScheduled.execute.mockResolvedValue(
        scheduled({ type, destinationAccountId: null }),
      );

      const response = await controller.create(user, {
        title: type === TransactionType.INCOME ? 'Salary' : 'Rent',
        amount: 12000,
        type,
        accountId: 'a1',
        scheduledFor: '2026-09-01T00:00:00.000Z',
      });

      expect(response.destinationAccountId).toBeNull();
    },
  );

  it('propagates BadRequestException when a transfer is missing its destination', async () => {
    const error = new BadRequestException(
      'Transfer scheduled transactions require a destination account',
    );
    createScheduled.execute.mockRejectedValue(error);

    await expect(
      controller.create(user, {
        title: 'Move money',
        amount: 75,
        type: TransactionType.TRANSFER,
        accountId: 'a1',
        scheduledFor: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBe(error);
    expect(createScheduled.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.TRANSFER,
        destinationAccountId: undefined,
      }),
    );
  });

  it('lists the scheduled transactions applying the filters', async () => {
    listScheduled.execute.mockResolvedValue([scheduled()]);

    const response = await controller.list(user, {
      status: ScheduledTransactionStatus.PENDING,
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    });

    expect(listScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      status: ScheduledTransactionStatus.PENDING,
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T23:59:59.999Z'),
    });
    expect(response).toHaveLength(1);
    expect(response[0].id).toBe('s1');
  });

  it('lists without a date range when it is not provided', async () => {
    listScheduled.execute.mockResolvedValue([]);

    await controller.list(user, {});

    expect(listScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      status: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('updates a scheduled transaction', async () => {
    updateScheduled.execute.mockResolvedValue(scheduled());

    await controller.update(user, 's1', {
      title: 'New rent',
      amount: 13000,
      scheduledFor: '2026-10-01T00:00:00.000Z',
      recurring: false,
    });

    expect(updateScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledTransactionId: 's1',
      accountId: undefined,
      destinationAccountId: undefined,
      categoryId: undefined,
      type: undefined,
      title: 'New rent',
      amount: 13000,
      scheduledFor: new Date('2026-10-01T00:00:00.000Z'),
      recurring: false,
      tags: undefined,
    });
  });

  it('propagates a transfer destination on update', async () => {
    updateScheduled.execute.mockResolvedValue(
      scheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
      }),
    );

    await controller.update(user, 's1', {
      type: TransactionType.TRANSFER,
      destinationAccountId: 'a2',
    });

    expect(updateScheduled.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
      }),
    );
  });

  it('propagates BadRequestException when an updated transfer has no destination', async () => {
    const error = new BadRequestException(
      'Transfer scheduled transactions require a destination account',
    );
    updateScheduled.execute.mockRejectedValue(error);

    await expect(
      controller.update(user, 's1', {
        type: TransactionType.TRANSFER,
      }),
    ).rejects.toBe(error);
    expect(updateScheduled.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.TRANSFER,
        destinationAccountId: undefined,
      }),
    );
  });

  it('deletes a scheduled transaction', async () => {
    await controller.remove(user, 's1');

    expect(deleteScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledTransactionId: 's1',
    });
  });

  it('executes a scheduled transaction with the confirmed adjustments and reschedule', async () => {
    const next = scheduled({ id: 's2' });
    executeScheduled.execute.mockResolvedValue({
      scheduled: scheduled({
        status: ScheduledTransactionStatus.EXECUTED,
        transactionId: 't1',
      }),
      transaction,
      next,
    });

    const response = await controller.execute(user, 's1', {
      amount: 12500,
      timestamp: '2026-08-20T00:00:00.000Z',
      accountId: 'a2',
      destinationAccountId: 'a3',
      categoryId: 'c2',
      reschedule: true,
      rescheduleFor: '2026-10-01T00:00:00.000Z',
    });

    expect(executeScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledTransactionId: 's1',
      amount: 12500,
      timestamp: new Date('2026-08-20T00:00:00.000Z'),
      accountId: 'a2',
      destinationAccountId: 'a3',
      categoryId: 'c2',
      reschedule: true,
      rescheduleFor: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(response.scheduled.status).toBe(ScheduledTransactionStatus.EXECUTED);
    expect(response.scheduled.transactionId).toBe('t1');
    expect(response.transaction).toEqual({
      id: 't1',
      accountId: 'a1',
      destinationAccountId: null,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Rent',
      amount: 12000,
      timestamp: new Date('2026-08-20T00:00:00.000Z'),
      tags: ['home'],
    });
    expect(response.next?.id).toBe('s2');
  });

  it('serializes the destination account of an executed transfer', async () => {
    const transfer = Transaction.restore({
      id: 't2',
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: null,
      type: TransactionType.TRANSFER,
      title: 'Move money',
      amount: 75,
      timestamp: new Date('2026-08-20T00:00:00.000Z'),
      tags: [],
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
    });
    executeScheduled.execute.mockResolvedValue({
      scheduled: scheduled({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
        categoryId: null,
        status: ScheduledTransactionStatus.EXECUTED,
        transactionId: 't2',
      }),
      transaction: transfer,
      next: null,
    });

    const response = await controller.execute(user, 's1', {});

    expect(response.transaction).toEqual({
      id: 't2',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: null,
      type: TransactionType.TRANSFER,
      title: 'Move money',
      amount: 75,
      timestamp: new Date('2026-08-20T00:00:00.000Z'),
      tags: [],
    });
  });

  it('executes without adjustments nor reschedule', async () => {
    executeScheduled.execute.mockResolvedValue({
      scheduled: scheduled(),
      transaction,
      next: null,
    });

    const response = await controller.execute(user, 's1', {});

    expect(executeScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledTransactionId: 's1',
      amount: undefined,
      timestamp: undefined,
      accountId: undefined,
      destinationAccountId: undefined,
      categoryId: undefined,
      reschedule: undefined,
      rescheduleFor: undefined,
    });
    expect(response.next).toBeNull();
  });

  it('cancels a scheduled transaction', async () => {
    cancelScheduled.execute.mockResolvedValue(
      scheduled({ status: ScheduledTransactionStatus.CANCELLED }),
    );

    const response = await controller.cancel(user, 's1');

    expect(cancelScheduled.execute).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledTransactionId: 's1',
    });
    expect(response.status).toBe(ScheduledTransactionStatus.CANCELLED);
  });
});
