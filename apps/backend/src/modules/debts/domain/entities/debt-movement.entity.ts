import { randomUUID } from 'node:crypto';
import { DebtMovementKind } from '../debt-movement-kind.enum';

export interface DebtMovementProps {
  id: string;
  userId: string;
  debtId: string;
  kind: DebtMovementKind;
  /** Efecto firmado sobre el saldo: positivo aumenta la deuda, negativo la reduce. */
  delta: number;
  amount: number;
  capitalAmount: number;
  interestAmount: number;
  transactionId: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export type CreateDebtMovementInput = Omit<
  DebtMovementProps,
  'id' | 'createdAt'
>;

export class DebtMovement {
  private readonly props: DebtMovementProps;

  private constructor(props: DebtMovementProps) {
    this.props = props;
  }

  static create(input: CreateDebtMovementInput): DebtMovement {
    return new DebtMovement({
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static restore(props: DebtMovementProps): DebtMovement {
    return new DebtMovement(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get debtId(): string {
    return this.props.debtId;
  }

  get kind(): DebtMovementKind {
    return this.props.kind;
  }

  get delta(): number {
    return this.props.delta;
  }

  get amount(): number {
    return this.props.amount;
  }

  get capitalAmount(): number {
    return this.props.capitalAmount;
  }

  get interestAmount(): number {
    return this.props.interestAmount;
  }

  get transactionId(): string | null {
    return this.props.transactionId;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
