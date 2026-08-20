import { randomUUID } from 'node:crypto';
import { TransactionType } from '../transaction-type.enum';
import { TransactionError } from '../transaction.error';

export interface TransactionProps {
  id: string;
  userId: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp: Date;
  tags: string[];
  createdAt: Date;
}

export type CreateTransactionInput = Omit<
  TransactionProps,
  'id' | 'createdAt' | 'destinationAccountId'
> & {
  destinationAccountId?: string | null;
};

type RestoreTransactionInput = Omit<
  TransactionProps,
  'destinationAccountId'
> & {
  destinationAccountId?: string | null;
};

export class Transaction {
  private readonly props: TransactionProps;

  private constructor(props: TransactionProps) {
    this.props = props;
  }

  static create(input: CreateTransactionInput): Transaction {
    this.assertDestination(input);

    return new Transaction({
      ...input,
      categoryId:
        input.type === TransactionType.TRANSFER ? null : input.categoryId,
      destinationAccountId: input.destinationAccountId ?? null,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static restore(props: RestoreTransactionInput): Transaction {
    return new Transaction({
      ...props,
      categoryId:
        props.type === TransactionType.TRANSFER ? null : props.categoryId,
      destinationAccountId: props.destinationAccountId ?? null,
    });
  }

  private static assertDestination(input: CreateTransactionInput): void {
    if (input.type === TransactionType.TRANSFER) {
      if (!input.destinationAccountId) {
        throw new TransactionError(
          'Transfer transactions require a destination account',
        );
      }
      if (input.destinationAccountId === input.accountId) {
        throw new TransactionError(
          'Transfer source and destination accounts must differ',
        );
      }
      return;
    }

    if (input.destinationAccountId != null) {
      throw new TransactionError(
        'Only transfer transactions can have a destination account',
      );
    }
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

  get destinationAccountId(): string | null {
    return this.props.destinationAccountId;
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

  getDestinationBalanceDelta(): number {
    return this.props.type === TransactionType.TRANSFER ? this.props.amount : 0;
  }
}
