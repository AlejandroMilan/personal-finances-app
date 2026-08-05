import { randomUUID } from 'node:crypto';

export interface CreditCardProps {
  id: string;
  accountId: string;
  creditLimit: number;
  usedAmount: number;
  cutoffDate: Date;
  paymentDate: Date;
}

export type CreateCreditCardInput = Omit<CreditCardProps, 'id'>;

export class CreditCard {
  private readonly props: CreditCardProps;

  private constructor(props: CreditCardProps) {
    this.props = props;
  }

  static create(input: CreateCreditCardInput): CreditCard {
    return new CreditCard({
      ...input,
      id: randomUUID(),
    });
  }

  static restore(props: CreditCardProps): CreditCard {
    return new CreditCard(props);
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get creditLimit(): number {
    return this.props.creditLimit;
  }

  get usedAmount(): number {
    return this.props.usedAmount;
  }

  get cutoffDate(): Date {
    return this.props.cutoffDate;
  }

  get paymentDate(): Date {
    return this.props.paymentDate;
  }
}
