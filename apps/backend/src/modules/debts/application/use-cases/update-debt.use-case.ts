import { Inject, Injectable } from '@nestjs/common';
import { GetDebtUseCase } from './get-debt.use-case';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { Debt } from '../../domain/entities/debt.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { roundMoney } from '../../domain/money';
import { withDebtErrors } from '../domain-error';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

export interface UpdateDebtInput {
  userId: string;
  debtId: string;
  name?: string;
  totalAmount?: number;
  revolving?: boolean;
  annualInterestRate?: number | null;
  paymentMode?: DebtPaymentMode;
}

@Injectable()
export class UpdateDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
    private readonly getDebt: GetDebtUseCase,
  ) {}

  async execute(input: UpdateDebtInput): Promise<Debt> {
    const existing = await this.getDebt.execute(input.userId, input.debtId);

    let debt = withDebtErrors(() =>
      existing.update({
        name: input.name,
        revolving: input.revolving,
        annualInterestRate: input.annualInterestRate,
        paymentMode: input.paymentMode,
      }),
    );

    const adjustment =
      input.totalAmount === undefined
        ? 0
        : roundMoney(input.totalAmount - existing.totalAmount);
    if (adjustment !== 0) {
      debt = withDebtErrors(() => debt.applyDelta(adjustment));
    }

    const saved = await this.debtRepository.save(debt);

    if (adjustment !== 0) {
      await this.movementRepository.save(
        DebtMovement.create({
          userId: saved.userId,
          debtId: saved.id,
          kind: DebtMovementKind.ADJUSTMENT,
          delta: adjustment,
          amount: Math.abs(adjustment),
          capitalAmount: Math.abs(adjustment),
          interestAmount: 0,
          transactionId: null,
          occurredAt: new Date(),
        }),
      );
    }

    return saved;
  }
}
