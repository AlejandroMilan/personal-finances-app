import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionError } from '../../domain/scheduled-transaction.error';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';

export interface CancelScheduledTransactionInput {
  userId: string;
  scheduledTransactionId: string;
}

@Injectable()
export class CancelScheduledTransactionUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
  ) {}

  async execute(
    input: CancelScheduledTransactionInput,
  ): Promise<ScheduledTransaction> {
    const existing = await this.scheduledRepository.findById(
      input.scheduledTransactionId,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Scheduled transaction not found');
    }

    try {
      return await this.scheduledRepository.save(existing.cancel());
    } catch (error) {
      if (error instanceof ScheduledTransactionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
