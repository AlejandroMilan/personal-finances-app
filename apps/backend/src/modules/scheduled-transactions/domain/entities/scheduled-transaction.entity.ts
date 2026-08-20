import { randomUUID } from 'node:crypto';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionError } from '../scheduled-transaction.error';
import { ScheduledTransactionStatus } from '../scheduled-transaction-status.enum';

export interface ScheduledTransactionProps {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  tags: string[];
  scheduledFor: Date;
  recurring: boolean;
  status: ScheduledTransactionStatus;
  /** Transacción real creada al confirmar; `null` mientras no se ejecuta. */
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateScheduledTransactionInput = Omit<
  ScheduledTransactionProps,
  'id' | 'status' | 'transactionId' | 'createdAt' | 'updatedAt'
>;

export class ScheduledTransaction {
  private readonly props: ScheduledTransactionProps;

  private constructor(props: ScheduledTransactionProps) {
    this.props = props;
  }

  static create(input: CreateScheduledTransactionInput): ScheduledTransaction {
    const title = input.title.trim();
    if (title.length === 0) {
      throw new ScheduledTransactionError('Title must not be empty');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ScheduledTransactionError('Amount must be greater than zero');
    }

    const now = new Date();
    return new ScheduledTransaction({
      ...input,
      title,
      tags: input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      id: randomUUID(),
      status: ScheduledTransactionStatus.PENDING,
      transactionId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ScheduledTransactionProps): ScheduledTransaction {
    return new ScheduledTransaction(props);
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

  get tags(): string[] {
    return this.props.tags;
  }

  get scheduledFor(): Date {
    return this.props.scheduledFor;
  }

  get recurring(): boolean {
    return this.props.recurring;
  }

  get status(): ScheduledTransactionStatus {
    return this.props.status;
  }

  get transactionId(): string | null {
    return this.props.transactionId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isPending(): boolean {
    return this.props.status === ScheduledTransactionStatus.PENDING;
  }

  /** Confirma la ejecución, enlazando la transacción real recién creada. */
  markExecuted(transactionId: string): ScheduledTransaction {
    this.assertPending('execute');
    return new ScheduledTransaction({
      ...this.props,
      status: ScheduledTransactionStatus.EXECUTED,
      transactionId,
      updatedAt: new Date(),
    });
  }

  cancel(): ScheduledTransaction {
    this.assertPending('cancel');
    return new ScheduledTransaction({
      ...this.props,
      status: ScheduledTransactionStatus.CANCELLED,
      updatedAt: new Date(),
    });
  }

  private assertPending(action: string): void {
    if (!this.isPending()) {
      throw new ScheduledTransactionError(
        `Cannot ${action} a scheduled transaction with status ${this.props.status}`,
      );
    }
  }
}
