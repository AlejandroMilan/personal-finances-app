import { Inject, Injectable } from '@nestjs/common';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';

export interface ListScheduledTransactionsInput {
  userId: string;
  status?: ScheduledTransactionStatus;
  from?: Date;
  to?: Date;
}

@Injectable()
export class ListScheduledTransactionsUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
  ) {}

  execute(
    input: ListScheduledTransactionsInput,
  ): Promise<ScheduledTransaction[]> {
    return this.scheduledRepository.findByUserId(input.userId, {
      status: input.status,
      from: input.from,
      to: input.to,
    });
  }
}
