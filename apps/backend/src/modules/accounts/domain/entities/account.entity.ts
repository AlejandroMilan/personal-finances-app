import { randomUUID } from 'node:crypto';
import { AccountType } from '../account-type.enum';

export interface AccountProps {
  id: string;
  userId: string;
  name: string;
  balance: number;
  color: string;
  type: AccountType;
  createdAt: Date;
}

export type CreateAccountInput = Omit<AccountProps, 'id' | 'createdAt'>;

export class Account {
  private readonly props: AccountProps;

  private constructor(props: AccountProps) {
    this.props = props;
  }

  static create(input: CreateAccountInput): Account {
    return new Account({
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static restore(props: AccountProps): Account {
    return new Account(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get balance(): number {
    return this.props.balance;
  }

  get color(): string {
    return this.props.color;
  }

  get type(): AccountType {
    return this.props.type;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
