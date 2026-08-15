import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { TransactionType } from '../domain/transaction-type.enum';
import { Transaction } from '../domain/entities/transaction.entity';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../application/use-cases/delete-transaction.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from '../application/use-cases/update-transaction.use-case';
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

  const user = { id: 'u1', email: 'ana@mail.com' };

  const transaction = () =>
    Transaction.restore({
      id: 't1',
      userId: 'u1',
      accountId: 'a1',
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
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
});
