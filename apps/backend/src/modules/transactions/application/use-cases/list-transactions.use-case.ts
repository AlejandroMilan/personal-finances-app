import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedTransactions,
  TransactionFilters,
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../ports/transaction.repository';

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(
    userId: string,
    filters: TransactionFilters,
  ): Promise<PaginatedTransactions> {
    const page = Math.max(1, filters.page);
    const limit = Math.min(100, Math.max(1, filters.limit));

    return this.transactionRepository.findByUserId(userId, {
      ...filters,
      page,
      limit,
    });
  }
}
