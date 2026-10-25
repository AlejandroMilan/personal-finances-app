import type { Debt, DebtMovement } from '../types/debt';

/** Redondeo a centavos; único punto de redondeo del módulo de deudas en el frontend. */
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export function totalDebt(debts: Debt[]): number {
  return roundMoney(debts.reduce((sum, debt) => sum + debt.totalAmount, 0));
}

export interface DebtShare {
  id: string;
  name: string;
  amount: number;
  ratio: number;
}

/** Reparto del total adeudado. Sin deuda total, cada parte vale cero (nunca NaN). */
export function debtShares(debts: Debt[]): DebtShare[] {
  const total = totalDebt(debts);
  return debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    amount: debt.totalAmount,
    ratio: total > 0 ? debt.totalAmount / total : 0,
  }));
}

export interface BalancePoint {
  at: string;
  value: number;
}

/**
 * Serie temporal del saldo. Sin `debtId` suma el saldo de todas las deudas
 * en cada punto del log; con `debtId` sigue sólo esa deuda.
 */
export function balanceSeries(
  movements: DebtMovement[],
  debtId?: string,
): BalancePoint[] {
  const chronological = [...movements]
    .filter((movement) => !debtId || movement.debtId === debtId)
    .sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );

  if (debtId) {
    return chronological.map((movement) => ({
      at: movement.occurredAt,
      value: movement.balanceAfter,
    }));
  }

  const lastBalance = new Map<string, number>();
  return chronological.map((movement) => {
    lastBalance.set(movement.debtId, movement.balanceAfter);
    const value = [...lastBalance.values()].reduce((sum, b) => sum + b, 0);
    return { at: movement.occurredAt, value: roundMoney(value) };
  });
}

/** Interés de un pago: lo pagado que no abona al capital. */
export function paymentInterest(amount: number, capital: number): number {
  return roundMoney(amount - capital);
}

/** Mensaje de validación del capital de un pago, o `null` si es válido. */
export function paymentCapitalError(amount: number, capital: number): string | null {
  if (!Number.isFinite(capital) || capital <= 0) {
    return 'El capital debe ser mayor que cero';
  }
  if (capital > amount) {
    return 'El capital no puede superar el monto pagado';
  }
  return null;
}
