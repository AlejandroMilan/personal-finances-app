import { Injectable } from '@nestjs/common';
import { DebtLedger } from '../../transactions/application/ports/debt-ledger.port';
import { DebtLink } from '../../transactions/domain/debt-link';
import { RecordDebtIncreaseUseCase } from '../application/use-cases/record-debt-increase.use-case';
import { RecordDebtPaymentUseCase } from '../application/use-cases/record-debt-payment.use-case';
import { RevertDebtMovementsUseCase } from '../application/use-cases/revert-debt-movements.use-case';

/** Implementa el puerto que usa transacciones; delega en los casos de uso de deudas. */
@Injectable()
export class DebtLedgerAdapter implements DebtLedger {
  constructor(
    private readonly recordPayment: RecordDebtPaymentUseCase,
    private readonly recordIncrease: RecordDebtIncreaseUseCase,
    private readonly revertMovements: RevertDebtMovementsUseCase,
  ) {}

  async record(
    userId: string,
    transactionId: string,
    link: DebtLink,
    occurredAt: Date,
  ): Promise<void> {
    const input = {
      userId,
      debtId: link.debtId,
      transactionId,
      capitalAmount: link.capitalAmount,
      interestAmount: link.interestAmount,
      occurredAt,
    };

    if (link.kind === 'payment') {
      await this.recordPayment.execute(input);
      return;
    }
    await this.recordIncrease.execute(input);
  }

  async revert(userId: string, transactionId: string): Promise<void> {
    await this.revertMovements.execute(userId, transactionId);
  }
}
