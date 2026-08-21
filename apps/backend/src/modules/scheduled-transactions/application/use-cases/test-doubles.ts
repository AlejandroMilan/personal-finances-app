import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { Category } from '../../../categories/domain/entities/category.entity';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';

export const scheduledRepositoryMock = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn(),
  deleteById: jest.fn(),
});

export const accountRepositoryMock = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn(),
  adjustBalance: jest.fn(),
  delete: jest.fn(),
});

export const categoryRepositoryMock = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

export const anAccount = (userId = 'u1'): Account =>
  Account.restore({
    id: 'a1',
    userId,
    name: 'Checking',
    type: AccountType.DEBIT,
    balance: 1000,
    color: '#2E6B4F',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

export const aCategory = (userId = 'u1'): Category =>
  Category.restore({
    id: 'c1',
    userId,
    name: 'Home',
    color: '#2E6B4F',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

export const aScheduled = (
  overrides: Partial<{
    id: string;
    userId: string;
    accountId: string;
    destinationAccountId: string | null;
    categoryId: string | null;
    type: TransactionType;
    title: string;
    amount: number;
    tags: string[];
    scheduledFor: Date;
    recurring: boolean;
    status: ScheduledTransactionStatus;
    transactionId: string | null;
  }> = {},
): ScheduledTransaction => {
  const date = new Date('2026-09-01T00:00:00.000Z');
  return ScheduledTransaction.restore({
    id: 's1',
    userId: 'u1',
    accountId: 'a1',
    destinationAccountId: null,
    categoryId: 'c1',
    type: TransactionType.EXPENSE,
    title: 'Rent',
    amount: 12000,
    tags: ['home'],
    scheduledFor: date,
    recurring: true,
    status: ScheduledTransactionStatus.PENDING,
    transactionId: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  });
};
