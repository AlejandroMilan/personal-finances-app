import { randomUUID } from 'node:crypto';
import { DebtError } from '../debt.error';
import { DebtPaymentMode } from '../debt-payment-mode.enum';
import { roundMoney } from '../money';

export interface DebtProps {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate: number | null;
  paymentMode: DebtPaymentMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDebtInput {
  userId: string;
  name: string;
  totalAmount: number;
  revolving: boolean;
  annualInterestRate?: number | null;
  paymentMode?: DebtPaymentMode;
}

export interface UpdateDebtInput {
  name?: string;
  revolving?: boolean;
  annualInterestRate?: number | null;
  paymentMode?: DebtPaymentMode;
}

export class Debt {
  private readonly props: DebtProps;

  private constructor(props: DebtProps) {
    this.props = props;
  }

  static create(input: CreateDebtInput): Debt {
    const now = new Date();
    return new Debt({
      id: randomUUID(),
      userId: input.userId,
      name: Debt.normalizeName(input.name),
      totalAmount: Debt.normalizeTotal(input.totalAmount),
      revolving: input.revolving,
      annualInterestRate: Debt.normalizeRate(input.annualInterestRate ?? null),
      paymentMode: input.paymentMode ?? DebtPaymentMode.CAPITAL,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: DebtProps): Debt {
    return new Debt(props);
  }

  update(changes: UpdateDebtInput): Debt {
    return new Debt({
      ...this.props,
      name:
        changes.name === undefined
          ? this.props.name
          : Debt.normalizeName(changes.name),
      revolving: changes.revolving ?? this.props.revolving,
      annualInterestRate:
        changes.annualInterestRate === undefined
          ? this.props.annualInterestRate
          : Debt.normalizeRate(changes.annualInterestRate),
      paymentMode: changes.paymentMode ?? this.props.paymentMode,
      updatedAt: new Date(),
    });
  }

  /** Devuelve una copia con el saldo ajustado; nunca deja la deuda negativa. */
  applyDelta(delta: number): Debt {
    const totalAmount = roundMoney(this.props.totalAmount + delta);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw new DebtError(
        'El saldo de la deuda no puede quedar por debajo de cero',
      );
    }
    return new Debt({ ...this.props, totalAmount, updatedAt: new Date() });
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

  get totalAmount(): number {
    return this.props.totalAmount;
  }

  get revolving(): boolean {
    return this.props.revolving;
  }

  get annualInterestRate(): number | null {
    return this.props.annualInterestRate;
  }

  get paymentMode(): DebtPaymentMode {
    return this.props.paymentMode;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private static normalizeName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new DebtError('El nombre de la deuda es obligatorio');
    }
    return trimmed;
  }

  private static normalizeTotal(totalAmount: number): number {
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw new DebtError('El adeudo total no puede ser negativo');
    }
    return roundMoney(totalAmount);
  }

  private static normalizeRate(rate: number | null): number | null {
    if (rate === null) {
      return null;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new DebtError('El interés anual debe estar entre 0 y 100');
    }
    return rate;
  }
}
