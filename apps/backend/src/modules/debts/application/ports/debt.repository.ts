import { Debt } from '../../domain/entities/debt.entity';

export interface DebtRepository {
  findById(id: string): Promise<Debt | null>;
  findByUserId(userId: string): Promise<Debt[]>;
  save(debt: Debt): Promise<Debt>;
  delete(id: string): Promise<void>;
}

export const DEBT_REPOSITORY = 'DEBT_REPOSITORY';
