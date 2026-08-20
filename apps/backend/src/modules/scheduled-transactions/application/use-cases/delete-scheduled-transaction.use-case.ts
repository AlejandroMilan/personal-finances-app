import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';

export interface DeleteScheduledTransactionInput {
  userId: string;
  scheduledTransactionId: string;
}

@Injectable()
export class DeleteScheduledTransactionUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
  ) {}

  async execute(input: DeleteScheduledTransactionInput): Promise<void> {
    const existing = await this.scheduledRepository.findById(
      input.scheduledTransactionId,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Scheduled transaction not found');
    }

    if (!existing.isPending()) {
      throw new ConflictException(
        'Only a pending scheduled transaction can be deleted',
      );
    }

    await this.scheduledRepository.deleteById(existing.id);
  }
}
