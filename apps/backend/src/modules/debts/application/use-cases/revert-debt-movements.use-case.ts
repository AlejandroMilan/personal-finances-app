import { Inject, Injectable } from '@nestjs/common';
import { withDebtErrors } from '../domain-error';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

/** Deshace el efecto sobre la deuda de una transacción y borra su movimiento. */
@Injectable()
export class RevertDebtMovementsUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
  ) {}

  async execute(userId: string, transactionId: string): Promise<void> {
    const movements =
      await this.movementRepository.findByTransactionId(transactionId);

    for (const movement of movements) {
      if (movement.userId !== userId) {
        continue;
      }

      const debt = await this.debtRepository.findById(movement.debtId);
      if (debt && debt.userId === userId) {
        const reverted = withDebtErrors(() => debt.applyDelta(-movement.delta));
        await this.debtRepository.save(reverted);
      }

      await this.movementRepository.deleteById(movement.id);
    }
  }
}
