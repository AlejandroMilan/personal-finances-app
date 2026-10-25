import { DebtMovement } from './entities/debt-movement.entity';
import { roundMoney } from './money';

export interface DebtMovementBalance {
  movement: DebtMovement;
  balanceBefore: number;
  balanceAfter: number;
}

/**
 * Calcula el saldo antes y después de cada movimiento de UNA deuda, en orden
 * cronológico, a partir de sus deltas. Al derivar el saldo del log en lugar de
 * guardarlo, borrar o editar un movimiento antiguo no desfasa los posteriores.
 */
export function computeDebtBalances(
  movements: DebtMovement[],
): DebtMovementBalance[] {
  const chronological = [...movements].sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let balance = 0;
  return chronological.map((movement) => {
    const balanceBefore = balance;
    balance = roundMoney(balance + movement.delta);
    return { movement, balanceBefore, balanceAfter: balance };
  });
}
