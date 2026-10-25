import { Inject, Injectable } from '@nestjs/common';
import {
  computeDebtBalances,
  DebtMovementBalance,
} from '../../domain/debt-balances';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import {
  DEBT_MOVEMENT_REPOSITORY,
  DebtMovementRepository,
} from '../ports/debt-movement.repository';

export interface ListDebtMovementsInput {
  userId: string;
  debtId?: string;
}

@Injectable()
export class ListDebtMovementsUseCase {
  constructor(
    @Inject(DEBT_MOVEMENT_REPOSITORY)
    private readonly movementRepository: DebtMovementRepository,
  ) {}

  /**
   * Log general (o de una deuda), del más reciente al más antiguo. Los saldos
   * se calculan por deuda sobre TODO su historial, no sólo sobre lo filtrado.
   */
  async execute(input: ListDebtMovementsInput): Promise<DebtMovementBalance[]> {
    const movements = await this.movementRepository.findByUserId(input.userId);

    const byDebt = new Map<string, DebtMovement[]>();
    for (const movement of movements) {
      const group = byDebt.get(movement.debtId) ?? [];
      group.push(movement);
      byDebt.set(movement.debtId, group);
    }

    const balances = [...byDebt.entries()]
      .filter(([debtId]) => !input.debtId || debtId === input.debtId)
      .flatMap(([, group]) => computeDebtBalances(group));

    return balances.sort(
      (a, b) =>
        b.movement.occurredAt.getTime() - a.movement.occurredAt.getTime() ||
        b.movement.createdAt.getTime() - a.movement.createdAt.getTime(),
    );
  }
}
