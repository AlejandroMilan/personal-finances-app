import { TransactionType } from '../../domain/transaction-type.enum';
import {
  PaginatedTransactions,
  TransactionFilters,
} from '../ports/transaction.repository';
import { ListTransactionsUseCase } from './list-transactions.use-case';

describe('ListTransactionsUseCase', () => {
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
    summarize: jest.fn(),
  };
  let useCase: ListTransactionsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTransactionsUseCase(transactionRepository);
  });

  it('returns the paginated transactions of the user', async () => {
    const result: PaginatedTransactions = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };
    transactionRepository.findByUserId.mockResolvedValue(result);

    const filters: TransactionFilters = {
      accountId: 'a1',
      type: TransactionType.EXPENSE,
      title: 'lunch',
      tags: ['food'],
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
      page: 1,
      limit: 20,
    };

    const response = await useCase.execute('u1', filters);

    expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
      'u1',
      filters,
    );
    expect(response).toBe(result);
  });

  it('clamps page to a minimum of 1 and limit to a maximum of 100', async () => {
    transactionRepository.findByUserId.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    await useCase.execute('u1', { page: 0, limit: 500 });

    expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ page: 1, limit: 100 }),
    );
  });
});
