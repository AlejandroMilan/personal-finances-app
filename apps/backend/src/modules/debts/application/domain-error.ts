import { BadRequestException } from '@nestjs/common';
import { DebtError } from '../domain/debt.error';

/** Traduce las violaciones del dominio de deudas a 400 en la frontera HTTP. */
export function withDebtErrors<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof DebtError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
