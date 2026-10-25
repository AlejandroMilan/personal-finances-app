import { Inject, Injectable } from '@nestjs/common';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { Debt } from '../../domain/entities/debt.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { withDebtErrors } from '../domain-error';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

export interface CreateDebtInput {
  userId: string;
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate?: number | null;
  paymentMode?: DebtPaymentMode;
}

@Injectable()
export class CreateDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
  ) {}

  async execute(input: CreateDebtInput): Promise<Debt> {
    const debt = withDebtErrors(() => Debt.create(input));
    const saved = await this.debtRepository.save(debt);

    await this.movementRepository.save(
      DebtMovement.create({
        userId: saved.userId,
        debtId: saved.id,
        kind: DebtMovementKind.INITIAL,
        delta: saved.totalAmount,
        amount: saved.totalAmount,
        capitalAmount: saved.totalAmount,
        interestAmount: 0,
        transactionId: null,
        occurredAt: saved.createdAt,
      }),
    );

    return saved;
  }
}
