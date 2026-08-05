import { randomUUID } from 'node:crypto';

export interface UserProps {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  registeredAt: Date;
}

export class User {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static create(input: Omit<UserProps, 'id' | 'registeredAt'>): User {
    return new User({
      ...input,
      id: randomUUID(),
      registeredAt: new Date(),
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get registeredAt(): Date {
    return this.props.registeredAt;
  }
}
