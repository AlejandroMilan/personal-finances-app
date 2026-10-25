import { Inject, Injectable } from '@nestjs/common';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { roundMoney } from '../../domain/money';
import { withDebtErrors } from '../domain-error';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';
import { GetDebtUseCase } from './get-debt.use-case';
import { RecordDebtEffectInput } from './record-debt-effect.input';

/**
 * Un pago reduce la deuda según su modo: sólo el capital, o el monto completo
 * pagado (capital + interés).
 */
@Injectable()
export class RecordDebtPaymentUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
    private readonly getDebt: GetDebtUseCase,
  ) {}

  async execute(input: RecordDebtEffectInput): Promise<void> {
    const debt = await this.getDebt.execute(input.userId, input.debtId);

    const paid = roundMoney(input.capitalAmount + input.interestAmount);
    const reduction =
      debt.paymentMode === DebtPaymentMode.TOTAL ? paid : input.capitalAmount;

    const updated = withDebtErrors(() => debt.applyDelta(-reduction));
    await this.debtRepository.save(updated);

    await this.movementRepository.save(
      DebtMovement.create({
        userId: input.userId,
        debtId: debt.id,
        kind: DebtMovementKind.PAYMENT,
        delta: -reduction,
        amount: paid,
        capitalAmount: input.capitalAmount,
        interestAmount: input.interestAmount,
        transactionId: input.transactionId,
        occurredAt: input.occurredAt,
      }),
    );
  }
}
