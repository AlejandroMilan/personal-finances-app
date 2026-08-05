export type AccountType = 'cash' | 'debit' | 'credit';

export interface CreditCardView {
  id: string;
  creditLimit: number;
  usedAmount: number;
  cutoffDate: string;
  paymentDate: string;
}

export interface AccountView {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: AccountType;
  creditCard: CreditCardView | null;
}

export interface CreditCardPayload {
  creditLimit: number;
  usedAmount?: number;
  cutoffDate: string;
  paymentDate: string;
}

export interface CreateAccountPayload {
  name: string;
  balance: number;
  color: string;
  type: AccountType;
  creditCard?: CreditCardPayload;
}

export interface UpdateAccountPayload {
  name?: string;
  balance?: number;
  color?: string;
  type?: AccountType;
  creditCard?: Partial<CreditCardPayload>;
}
