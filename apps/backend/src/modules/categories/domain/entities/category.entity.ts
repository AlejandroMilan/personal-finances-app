import { randomUUID } from 'node:crypto';

export interface CategoryProps {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export type CreateCategoryInput = Omit<CategoryProps, 'id' | 'createdAt'>;

export class Category {
  private readonly props: CategoryProps;

  private constructor(props: CategoryProps) {
    this.props = props;
  }

  static create(input: CreateCategoryInput): Category {
    return new Category({
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static restore(props: CategoryProps): Category {
    return new Category(props);
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

  get color(): string {
    return this.props.color;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
