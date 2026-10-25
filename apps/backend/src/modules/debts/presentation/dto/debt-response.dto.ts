import { Debt } from '../../domain/entities/debt.entity';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtMovementBalance } from '../../domain/debt-balances';

export interface DebtView {
  id: string;
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate: number | null;
  paymentMode: DebtPaymentMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtMovementView {
  id: string;
  debtId: string;
  kind: DebtMovementKind;
  delta: number;
  amount: number;
  capitalAmount: number;
  interestAmount: number;
  transactionId: string | null;
  occurredAt: Date;
  balanceBefore: number;
  balanceAfter: number;
}

export const toDebtView = (debt: Debt): DebtView => ({
  id: debt.id,
  name: debt.name,
  totalAmount: debt.totalAmount,
  revolving: debt.revolving,
  annualInterestRate: debt.annualInterestRate,
  paymentMode: debt.paymentMode,
  createdAt: debt.createdAt,
  updatedAt: debt.updatedAt,
});

export const toDebtMovementView = ({
  movement,
  balanceBefore,
  balanceAfter,
}: DebtMovementBalance): DebtMovementView => ({
  id: movement.id,
  debtId: movement.debtId,
  kind: movement.kind,
  delta: movement.delta,
  amount: movement.amount,
  capitalAmount: movement.capitalAmount,
  interestAmount: movement.interestAmount,
  transactionId: movement.transactionId,
  occurredAt: movement.occurredAt,
  balanceBefore,
  balanceAfter,
});
