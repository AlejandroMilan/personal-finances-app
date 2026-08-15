import { randomUUID } from 'node:crypto';
import { TransactionType } from '../transaction-type.enum';

export interface TransactionProps {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp: Date;
  tags: string[];
  createdAt: Date;
}

export type CreateTransactionInput = Omit<TransactionProps, 'id' | 'createdAt'>;

export class Transaction {
  private readonly props: TransactionProps;

  private constructor(props: TransactionProps) {
    this.props = props;
  }

  static create(input: CreateTransactionInput): Transaction {
    return new Transaction({
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static restore(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get type(): TransactionType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get amount(): number {
    return this.props.amount;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get tags(): string[] {
    return this.props.tags;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  getBalanceDelta(): number {
    return this.props.type === TransactionType.INCOME
      ? this.props.amount
      : -this.props.amount;
  }
}
