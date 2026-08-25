import { randomUUID } from 'node:crypto';
import { BudgetError } from '../budget.error';
import { BudgetItemType } from '../budget-item-type.enum';
import {
  MAX_BUDGET_ITEMS,
  MAX_BUDGET_NOTE_LENGTH,
} from '../budget-limits';
import type { BudgetItem } from '../budget-item.type';

export type { BudgetItem } from '../budget-item.type';
export { BudgetItemType } from '../budget-item-type.enum';

export interface BudgetProps {
  id: string;
  userId: string;
  month: string;
  items: BudgetItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateBudgetInput = Omit<
  BudgetProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class Budget {
  private readonly props: BudgetProps;

  private constructor(props: BudgetProps) {
    this.props = props;
  }

  static create(input: CreateBudgetInput): Budget {
    Budget.assertMonth(input.month);
    Budget.assertItems(input.items);

    const now = new Date();
    return new Budget({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: BudgetProps): Budget {
    Budget.assertItemBounds(props.items);
    return new Budget(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get month(): string {
    return this.props.month;
  }

  get items(): BudgetItem[] {
    return this.props.items;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  plannedFor(categoryId: string, type: BudgetItemType): number {
    return (
      this.props.items.find(
        (item) => item.categoryId === categoryId && item.type === type,
      )?.amount ?? 0
    );
  }

  static assertMonth(month: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BudgetError('Month must use the YYYY-MM format');
    }
  }

  private static assertItems(items: BudgetItem[]): void {
    Budget.assertItemBounds(items);

    const categoriesByType = new Map<string, Set<BudgetItemType>>();

    for (const item of items) {
      Budget.assertItemAmount(item.amount);
      Budget.assertItemType(item.type);

      const types = categoriesByType.get(item.categoryId) ?? new Set();
      if (types.has(item.type)) {
        throw new BudgetError(
          'A category cannot have more than one item of the same type',
        );
      }
      types.add(item.type);
      categoriesByType.set(item.categoryId, types);
    }
  }

  private static assertItemAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BudgetError('Budget item amount must be greater than zero');
    }
  }

  private static assertItemBounds(items: BudgetItem[]): void {
    if (items.length > MAX_BUDGET_ITEMS) {
      throw new BudgetError(
        `A budget cannot contain more than ${MAX_BUDGET_ITEMS} items`,
      );
    }

    for (const item of items) {
      if (
        item.note !== undefined &&
        (typeof item.note !== 'string' ||
          item.note.length > MAX_BUDGET_NOTE_LENGTH)
      ) {
        throw new BudgetError(
          `A budget item note cannot exceed ${MAX_BUDGET_NOTE_LENGTH} characters`,
        );
      }
    }
  }

  private static assertItemType(type: BudgetItemType): void {
    if (type !== BudgetItemType.INCOME && type !== BudgetItemType.EXPENSE) {
      throw new BudgetError('Budget item type must be income or expense');
    }
  }
}
