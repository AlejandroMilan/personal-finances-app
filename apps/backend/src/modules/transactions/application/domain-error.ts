import { BadRequestException } from '@nestjs/common';
import { TransactionError } from '../domain/transaction.error';

/** Traduce las violaciones del dominio de transacciones a 400. */
export function withTransactionErrors<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof TransactionError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
