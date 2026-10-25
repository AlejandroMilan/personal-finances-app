import { DebtMovement } from '../../domain/entities/debt-movement.entity';

export interface DebtMovementRepository {
  findByUserId(userId: string): Promise<DebtMovement[]>;
  findByDebtId(debtId: string): Promise<DebtMovement[]>;
  findByTransactionId(transactionId: string): Promise<DebtMovement[]>;
  save(movement: DebtMovement): Promise<DebtMovement>;
  deleteByDebtId(debtId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
}

export const DEBT_MOVEMENT_REPOSITORY = 'DEBT_MOVEMENT_REPOSITORY';
