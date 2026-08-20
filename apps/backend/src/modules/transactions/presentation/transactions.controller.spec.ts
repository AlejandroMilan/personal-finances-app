import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { TransactionType } from '../domain/transaction-type.enum';
import { Transaction } from '../domain/entities/transaction.entity';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../application/use-cases/delete-transaction.use-case';
import { GetTransactionsSummaryUseCase } from '../application/use-cases/get-transactions-summary.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from '../application/use-cases/update-transaction.use-case';
import { JwtAuthGuard } from '../../auth/infrastructure/security/jwt-auth.guard';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  const createTransaction = { execute: jest.fn() };
  const listTransactions = { execute: jest.fn() };
  const updateTransaction = { execute: jest.fn() };
  const deleteTransaction = { execute: jest.fn() };
  const getTransactionsSummary = { execute: jest.fn() };

  const user = { id: 'u1', email: 'ana@mail.com' };

  const transaction = (type = TransactionType.EXPENSE) =>
    Transaction.restore({
      id: 't1',
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: null,
      categoryId: 'c1',
      type,
      title: 'Lunch',
      amount: 50,
      timestamp: new Date('2026-08-01T12:00:00.000Z'),
      tags: ['food'],
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: createTransaction },
        { provide: ListTransactionsUseCase, useValue: listTransactions },
        { provide: UpdateTransactionUseCase, useValue: updateTransaction },
        { provide: DeleteTransactionUseCase, useValue: deleteTransaction },
        {
          provide: GetTransactionsSummaryUseCase,
          useValue: getTransactionsSummary,
        },
        {
          provide: TOKEN_SERVICE,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('creates a transaction returning its view', async () => {
    createTransaction.execute.mockResolvedValue(transaction());
    const dto: CreateTransactionDto = {
      title: 'Lunch',
      amount: 50,
      type: TransactionType.EXPENSE,
      accountId: 'a1',
      categoryId: 'c1',
      timestamp: '2026-08-01T12:00:00.000Z',
      tags: ['food'],
    };

    const response = await controller.create(user, dto);

    expect(createTransaction.execute).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: undefined,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Lunch',
      amount: 50,
      timestamp: new Date('2026-08-01T12:00:00.000Z'),
      tags: ['food'],
    });
    expect(response).toEqual({
      id: 't1',
      accountId: 'a1',
      destinationAccountId: null,
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Lunch',
      amount: 50,
      timestamp: new Date('2026-08-01T12:00:00.000Z'),
      tags: ['food'],
    });
  });

  it('lists transactions applying the query filters', async () => {
    listTransactions.execute.mockResolvedValue({
      items: [transaction()],
      total: 1,
      page: 1,
      limit: 20,
    });
    const dto: ListTransactionsDto = {
      page: 1,
      limit: 20,
      accountId: 'a1',
      type: TransactionType.EXPENSE,
      title: 'lunch',
      tags: 'food,coffee',
      from: '2026-08-01',
      to: '2026-08-31',
    };

    const response = await controller.list(user, dto);

    expect(listTransactions.execute).toHaveBeenCalledWith('u1', {
      accountId: 'a1',
      categoryId: undefined,
      type: TransactionType.EXPENSE,
      title: 'lunch',
      tags: ['food', 'coffee'],
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
      page: 1,
      limit: 20,
    });
    expect(response.items).toHaveLength(1);
    expect(response.total).toBe(1);
    expect(response.page).toBe(1);
  });

  it('creates a transfer with its destination and returns it in the view', async () => {
    createTransaction.execute.mockResolvedValue(
      Transaction.restore({
        id: 't2',
        userId: 'u1',
        accountId: 'a1',
        destinationAccountId: 'a2',
        categoryId: null,
        type: TransactionType.TRANSFER,
        title: 'Move money',
        amount: 75,
        timestamp: new Date('2026-08-02T12:00:00.000Z'),
        tags: [],
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
      }),
    );
    const dto: CreateTransactionDto = {
      title: 'Move money',
      amount: 75,
      type: TransactionType.TRANSFER,
      accountId: 'a1',
      destinationAccountId: 'a2',
    };

    const response = await controller.create(user, dto);

    expect(createTransaction.execute).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: undefined,
      type: TransactionType.TRANSFER,
      title: 'Move money',
      amount: 75,
      timestamp: undefined,
      tags: undefined,
    });
    expect(response).toEqual({
      id: 't2',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: null,
      type: TransactionType.TRANSFER,
      title: 'Move money',
      amount: 75,
      timestamp: new Date('2026-08-02T12:00:00.000Z'),
      tags: [],
    });
  });

  it.each([TransactionType.INCOME, TransactionType.EXPENSE])(
    'includes destinationAccountId as null for %s transactions',
    async (type) => {
      createTransaction.execute.mockResolvedValue(transaction(type));

      const response = await controller.create(user, {
        title: type === TransactionType.INCOME ? 'Salary' : 'Lunch',
        amount: 50,
        type,
        accountId: 'a1',
        categoryId: 'c1',
      });

      expect(response).toEqual(
        expect.objectContaining({
          type,
          destinationAccountId: null,
        }),
      );
      expect(
        Object.prototype.hasOwnProperty.call(response, 'destinationAccountId'),
      ).toBe(true);
    },
  );

  it('propagates a bad request when a transfer has no destination', async () => {
    const error = new BadRequestException(
      'Transfer transactions require a destination account',
    );
    createTransaction.execute.mockRejectedValue(error);
    const dto: CreateTransactionDto = {
      title: 'Move money',
      amount: 75,
      type: TransactionType.TRANSFER,
      accountId: 'a1',
    };

    await expect(controller.create(user, dto)).rejects.toBe(error);

    expect(error.getStatus()).toBe(400);
    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: TransactionType.TRANSFER,
        destinationAccountId: undefined,
      }),
    );
  });

  it('lists transfers through the existing type filter for the current user', async () => {
    const transfer = Transaction.restore({
      id: 't2',
      userId: 'u1',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: null,
      type: TransactionType.TRANSFER,
      title: 'Move money',
      amount: 75,
      timestamp: new Date('2026-08-02T12:00:00.000Z'),
      tags: [],
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
    });
    listTransactions.execute.mockResolvedValue({
      items: [transfer],
      total: 1,
      page: 1,
      limit: 20,
    });

    const response = await controller.list(user, {
      type: TransactionType.TRANSFER,
    });

    expect(listTransactions.execute).toHaveBeenCalledWith('u1', {
      accountId: undefined,
      categoryId: undefined,
      type: TransactionType.TRANSFER,
      title: undefined,
      tags: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20,
    });
    expect(response.items).toEqual([
      expect.objectContaining({
        type: TransactionType.TRANSFER,
        destinationAccountId: 'a2',
      }),
    ]);
  });

  it('lists transactions without filters using defaults', async () => {
    listTransactions.execute.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.list(user, {});

    expect(listTransactions.execute).toHaveBeenCalledWith('u1', {
      accountId: undefined,
      categoryId: undefined,
      type: undefined,
      title: undefined,
      tags: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('updates a transaction returning its view', async () => {
    updateTransaction.execute.mockResolvedValue(transaction());
    const dto: UpdateTransactionDto = { title: 'Dinner', amount: 80 };

    const response = await controller.update(user, 't1', dto);

    expect(updateTransaction.execute).toHaveBeenCalledWith({
      userId: 'u1',
      transactionId: 't1',
      accountId: undefined,
      destinationAccountId: undefined,
      categoryId: undefined,
      type: undefined,
      title: 'Dinner',
      amount: 80,
      timestamp: undefined,
      tags: undefined,
    });
    expect(response.title).toBe('Lunch');
  });

  it('deletes a transaction', async () => {
    await controller.remove(user, 't1');

    expect(deleteTransaction.execute).toHaveBeenCalledWith({
      userId: 'u1',
      transactionId: 't1',
    });
  });

  it('protects every route of the controller with the JWT guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      TransactionsController,
    ) as unknown[];

    expect(guards).toContain(JwtAuthGuard);
  });

  describe('summary', () => {
    const summaryDto = {
      from: '2026-08-01T06:00:00.000Z',
      to: '2026-08-31T05:59:59.999Z',
      granularity: 'day',
      timeZone: 'America/Mexico_City',
    } as never;

    const summary = {
      totals: { income: 900, expense: 250.5 },
      byCategory: {
        income: [{ categoryId: 'c3', total: 900 }],
        expense: [
          { categoryId: 'c1', total: 200.5 },
          { categoryId: null, total: 50 },
        ],
      },
      series: [
        {
          bucket: new Date('2026-08-01T06:00:00.000Z'),
          income: 900,
          expense: 250.5,
        },
      ],
    };

    it('returns the period summary of the authenticated user', async () => {
      getTransactionsSummary.execute.mockResolvedValue(summary);

      const result = await controller.summary(user, summaryDto);

      expect(getTransactionsSummary.execute).toHaveBeenCalledWith({
        userId: 'u1',
        from: new Date('2026-08-01T06:00:00.000Z'),
        to: new Date('2026-08-31T05:59:59.999Z'),
        granularity: 'day',
        timeZone: 'America/Mexico_City',
      });
      expect(result).toEqual({
        from: '2026-08-01T06:00:00.000Z',
        to: '2026-08-31T05:59:59.999Z',
        granularity: 'day',
        timeZone: 'America/Mexico_City',
        totals: { income: 900, expense: 250.5 },
        byCategory: summary.byCategory,
        series: [
          {
            bucket: '2026-08-01T06:00:00.000Z',
            income: 900,
            expense: 250.5,
          },
        ],
      });
    });

    it('ignores any user identifier coming in the query and uses the token one', async () => {
      getTransactionsSummary.execute.mockResolvedValue(summary);

      await controller.summary(user, {
        ...(summaryDto as object),
        userId: 'someone-else',
      } as never);

      expect(getTransactionsSummary.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1' }),
      );
    });

    it('defaults the time zone to UTC when the client does not send one', async () => {
      getTransactionsSummary.execute.mockResolvedValue({
        ...summary,
        series: [],
      });

      const result = await controller.summary(user, {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-02T00:00:00.000Z',
        granularity: 'day',
      } as never);

      expect(getTransactionsSummary.execute).toHaveBeenCalledWith(
        expect.objectContaining({ timeZone: 'UTC' }),
      );
      expect(result.timeZone).toBe('UTC');
    });

    it('propagates the use case errors instead of swallowing them', async () => {
      getTransactionsSummary.execute.mockRejectedValue(
        new BadRequestException('from must not be after to'),
      );

      await expect(controller.summary(user, summaryDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
