import { computeDebtBalances } from './debt-balances';
import { DebtMovement } from './entities/debt-movement.entity';
import { DebtMovementKind } from './debt-movement-kind.enum';

const movement = (
  delta: number,
  occurredAt: string,
  createdAt = occurredAt,
): DebtMovement =>
  DebtMovement.restore({
    id: `${occurredAt}-${delta}`,
    userId: 'u1',
    debtId: 'd1',
    kind: delta > 0 ? DebtMovementKind.INCREASE : DebtMovementKind.PAYMENT,
    delta,
    amount: Math.abs(delta),
    capitalAmount: Math.abs(delta),
    interestAmount: 0,
    transactionId: null,
    occurredAt: new Date(occurredAt),
    createdAt: new Date(createdAt),
  });

describe('computeDebtBalances', () => {
  it('returns no balances for an empty log', () => {
    expect(computeDebtBalances([])).toEqual([]);
  });

  it('accumulates the deltas in chronological order', () => {
    const result = computeDebtBalances([
      movement(-100, '2026-03-01T00:00:00.000Z'),
      movement(1000, '2026-01-01T00:00:00.000Z'),
      movement(50.1, '2026-02-01T00:00:00.000Z'),
    ]);

    expect(result.map((r) => [r.balanceBefore, r.balanceAfter])).toEqual([
      [0, 1000],
      [1000, 1050.1],
      [1050.1, 950.1],
    ]);
  });

  it('breaks ties on occurredAt using createdAt', () => {
    const when = '2026-01-01T00:00:00.000Z';
    const result = computeDebtBalances([
      movement(-10, when, '2026-01-01T00:00:02.000Z'),
      movement(100, when, '2026-01-01T00:00:01.000Z'),
    ]);

    expect(result.map((r) => r.movement.delta)).toEqual([100, -10]);
    expect(result[1].balanceAfter).toBe(90);
  });

  it('does not mutate the input order', () => {
    const input = [
      movement(-1, '2026-02-01T00:00:00.000Z'),
      movement(5, '2026-01-01T00:00:00.000Z'),
    ];
    computeDebtBalances(input);
    expect(input[0].delta).toBe(-1);
  });
});
