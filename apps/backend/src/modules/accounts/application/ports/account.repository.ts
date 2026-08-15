import { Account } from '../../domain/entities/account.entity';

export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  findByUserId(userId: string): Promise<Account[]>;
  save(account: Account): Promise<Account>;
  adjustBalance(id: string, delta: number): Promise<Account | null>;
  delete(id: string): Promise<void>;
}

export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
