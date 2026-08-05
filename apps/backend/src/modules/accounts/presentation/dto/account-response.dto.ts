import { AccountType } from '../../domain/account-type.enum';

export interface CreditCardView {
  id: string;
  creditLimit: number;
  usedAmount: number;
  cutoffDate: Date;
  paymentDate: Date;
}

export interface AccountView {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: AccountType;
  creditCard: CreditCardView | null;
}
