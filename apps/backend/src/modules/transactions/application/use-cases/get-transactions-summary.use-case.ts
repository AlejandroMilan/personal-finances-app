import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  SummaryGranularity,
  TransactionRepository,
  TransactionsSummary,
  TRANSACTION_REPOSITORY,
} from '../ports/transaction.repository';

export interface GetTransactionsSummaryInput {
  userId: string;
  from: Date;
  to: Date;
  granularity: SummaryGranularity;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = 'UTC';

/**
 * Duración máxima del rango por granularidad. Acota el número de puntos de la
 * serie: sin este tope, un rango de años por horas generaría cientos de miles de
 * buckets y agotaría la memoria del proceso.
 */
const MAX_RANGE_MS: Record<SummaryGranularity, number> = {
  hour: 8 * 24 * 60 * 60 * 1000, // 8 días
  day: 400 * 24 * 60 * 60 * 1000, // ~13 meses
  month: 3700 * 24 * 60 * 60 * 1000, // ~10 años
};

@Injectable()
export class GetTransactionsSummaryUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(
    input: GetTransactionsSummaryInput,
  ): Promise<TransactionsSummary> {
    const { from, to, granularity } = input;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('from and to must be valid dates');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must not be after to');
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS[granularity]) {
      throw new BadRequestException(
        `The range is too wide for the "${granularity}" granularity`,
      );
    }

    return this.transactionRepository.summarize(input.userId, {
      from,
      to,
      granularity,
      timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
    });
  }
}
