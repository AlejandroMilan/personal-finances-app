import { DebtLink } from '../../domain/debt-link';

/**
 * Puerto hacia el módulo de deudas. Las transacciones lo usan para aplicar y
 * revertir su efecto sobre una deuda sin conocer su modelo.
 */
export interface DebtLedger {
  record(
    userId: string,
    transactionId: string,
    link: DebtLink,
    occurredAt: Date,
  ): Promise<void>;
  revert(userId: string, transactionId: string): Promise<void>;
}

export const DEBT_LEDGER = 'DEBT_LEDGER';
