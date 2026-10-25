import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { GetDebtUseCase } from './get-debt.use-case';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

@Injectable()
export class DeleteDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
    private readonly getDebt: GetDebtUseCase,
  ) {}

  async execute(userId: string, debtId: string): Promise<void> {
    const debt = await this.getDebt.execute(userId, debtId);

    const movements = await this.movementRepository.findByDebtId(debt.id);
    const hasActivity = movements.some(
      (movement) => movement.kind !== DebtMovementKind.INITIAL,
    );
    if (hasActivity) {
      throw new ConflictException(
        'La deuda tiene movimientos registrados y no puede eliminarse',
      );
    }

    await this.movementRepository.deleteByDebtId(debt.id);
    await this.debtRepository.delete(debt.id);
  }
}
