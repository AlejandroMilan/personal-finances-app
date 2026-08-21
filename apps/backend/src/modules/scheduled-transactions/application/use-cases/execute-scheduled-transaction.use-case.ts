import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionUseCase } from '../../../transactions/application/use-cases/create-transaction.use-case';
import { Transaction } from '../../../transactions/domain/entities/transaction.entity';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { nextScheduledDate } from '../../domain/next-scheduled-date.util';
import { ScheduledTransactionError } from '../../domain/scheduled-transaction.error';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';

export interface ExecuteScheduledTransactionInput {
  userId: string;
  scheduledTransactionId: string;
  /** Ajustes confirmados por el usuario; sin ellos se usan los datos agendados. */
  amount?: number;
  timestamp?: Date;
  accountId?: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  /** Pide agendar la siguiente ocurrencia; sin fecha, un mes después. */
  reschedule?: boolean;
  /** Fecha exacta de la siguiente ocurrencia; implica `reschedule`. */
  rescheduleFor?: Date;
}

export interface ExecuteScheduledTransactionResult {
  scheduled: ScheduledTransaction;
  transaction: Transaction;
  next: ScheduledTransaction | null;
}

@Injectable()
export class ExecuteScheduledTransactionUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    input: ExecuteScheduledTransactionInput,
  ): Promise<ExecuteScheduledTransactionResult> {
    const existing = await this.scheduledRepository.findById(
      input.scheduledTransactionId,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Scheduled transaction not found');
    }

    if (!existing.isPending()) {
      throw new ConflictException(
        'Only a pending scheduled transaction can be executed',
      );
    }

    // Las reglas de saldo, crédito y pertenencia viven en el módulo de
    // transacciones: aquí sólo se delega con los datos confirmados.
    const destinationAccountId =
      input.destinationAccountId === undefined
        ? existing.destinationAccountId
        : input.destinationAccountId;
    const transaction = await this.createTransaction.execute({
      userId: input.userId,
      accountId: input.accountId ?? existing.accountId,
      destinationAccountId,
      categoryId:
        existing.type === TransactionType.TRANSFER
          ? null
          : input.categoryId === undefined
            ? existing.categoryId
            : input.categoryId,
      type: existing.type,
      title: existing.title,
      amount: input.amount ?? existing.amount,
      timestamp: input.timestamp ?? new Date(),
      tags: existing.tags,
    });

    const scheduled = await this.saveExecuted(existing, transaction.id);
    const next = await this.scheduleNext(existing, input);

    return { scheduled, transaction, next };
  }

  private async saveExecuted(
    existing: ScheduledTransaction,
    transactionId: string,
  ): Promise<ScheduledTransaction> {
    try {
      return await this.scheduledRepository.save(
        existing.markExecuted(transactionId),
      );
    } catch (error) {
      if (error instanceof ScheduledTransactionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  private async scheduleNext(
    existing: ScheduledTransaction,
    input: ExecuteScheduledTransactionInput,
  ): Promise<ScheduledTransaction | null> {
    if (!input.rescheduleFor && !input.reschedule) {
      return null;
    }

    // Sin fecha explícita manda el default del dominio: un mes después de la
    // fecha prevista, no de hoy.
    const scheduledFor =
      input.rescheduleFor ?? nextScheduledDate(existing.scheduledFor);

    return this.scheduledRepository.save(
      ScheduledTransaction.create({
        userId: existing.userId,
        accountId: existing.accountId,
        destinationAccountId: existing.destinationAccountId,
        categoryId: existing.categoryId,
        type: existing.type,
        title: existing.title,
        amount: existing.amount,
        tags: existing.tags,
        scheduledFor,
        recurring: true,
      }),
    );
  }
}
