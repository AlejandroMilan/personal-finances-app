import { roundMoney } from '../../debts/domain/money';
import { TransactionType } from './transaction-type.enum';
import { TransactionError } from './transaction.error';

export type DebtLinkKind = 'payment' | 'increase';

/** Vínculo ya validado y calculado que se guarda con la transacción. */
export interface DebtLink {
  kind: DebtLinkKind;
  debtId: string;
  /** Pago: parte de capital. Aumento: monto recibido. */
  capitalAmount: number;
  /** Pago: monto − capital (calculado). Aumento: interés adicional. */
  interestAmount: number;
}

/** Lo que pide el cliente; el interés de un pago nunca se acepta de fuera. */
export interface DebtLinkRequest {
  kind: DebtLinkKind;
  debtId: string;
  capitalAmount?: number;
  interestAmount?: number;
}

export function buildDebtLink(
  type: TransactionType,
  amount: number,
  request: DebtLinkRequest,
): DebtLink {
  if (request.kind === 'payment') {
    return buildPaymentLink(type, amount, request);
  }
  return buildIncreaseLink(type, amount, request);
}

function buildPaymentLink(
  type: TransactionType,
  amount: number,
  request: DebtLinkRequest,
): DebtLink {
  if (type !== TransactionType.EXPENSE) {
    throw new TransactionError('Only expense transactions can pay a debt');
  }

  const capital = request.capitalAmount;
  if (
    capital === undefined ||
    !Number.isFinite(capital) ||
    capital <= 0 ||
    capital > amount
  ) {
    throw new TransactionError(
      'La cantidad a capital debe ser mayor que cero y no superar el monto pagado',
    );
  }

  const capitalAmount = roundMoney(capital);
  return {
    kind: 'payment',
    debtId: request.debtId,
    capitalAmount,
    interestAmount: roundMoney(amount - capitalAmount),
  };
}

function buildIncreaseLink(
  type: TransactionType,
  amount: number,
  request: DebtLinkRequest,
): DebtLink {
  if (type !== TransactionType.INCOME) {
    throw new TransactionError('Only income transactions can increase a debt');
  }

  const interest = request.interestAmount ?? 0;
  if (!Number.isFinite(interest) || interest < 0) {
    throw new TransactionError('La cantidad adicional de interés no es válida');
  }

  return {
    kind: 'increase',
    debtId: request.debtId,
    capitalAmount: roundMoney(amount),
    interestAmount: roundMoney(interest),
  };
}

/** Convierte un vínculo guardado en una petición, para recalcularlo al editar. */
export function toDebtLinkRequest(link: DebtLink): DebtLinkRequest {
  return link.kind === 'payment'
    ? {
        kind: 'payment',
        debtId: link.debtId,
        capitalAmount: link.capitalAmount,
      }
    : {
        kind: 'increase',
        debtId: link.debtId,
        interestAmount: link.interestAmount,
      };
}
