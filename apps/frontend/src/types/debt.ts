export type DebtPaymentMode = 'capital' | 'total';

export type DebtMovementKind = 'alta' | 'pago' | 'aumento' | 'ajuste';

export type DebtLinkKind = 'payment' | 'increase';

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate: number | null;
  paymentMode: DebtPaymentMode;
  createdAt: string;
  updatedAt: string;
}

export interface DebtMovement {
  id: string;
  debtId: string;
  kind: DebtMovementKind;
  delta: number;
  amount: number;
  capitalAmount: number;
  interestAmount: number;
  transactionId: string | null;
  occurredAt: string;
  balanceBefore: number;
  balanceAfter: number;
}

/** Vínculo de una transacción con una deuda, tal como lo devuelve la API. */
export interface DebtLink {
  kind: DebtLinkKind;
  debtId: string;
  capitalAmount: number;
  interestAmount: number;
}

/** Vínculo que se envía al crear o editar una transacción o un movimiento agendado. */
export interface DebtLinkPayload {
  kind: DebtLinkKind;
  debtId: string;
  capitalAmount?: number;
  interestAmount?: number;
}

export interface CreateDebtPayload {
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate?: number | null;
  paymentMode?: DebtPaymentMode;
}

export type UpdateDebtPayload = Partial<CreateDebtPayload>;
